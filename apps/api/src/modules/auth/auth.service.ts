import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH, type AuthResponse, maskEmail, OTP, type OtpPurpose, type OtpSent, type OtpVerified } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { Mailer } from '../../core/mail/mailer.js';
import { UsersRepository } from '../users/users.repository.js';
import { toMe, UsersService } from '../users/users.service.js';
import type { LoginDto, ResetPasswordDto, SignupDto } from './dto/auth.dto.js';
import { otpMail } from './otp-mail.js';
import { checkCode, newCode, resendWait } from './otp-rules.js';
import { OtpRepository } from './otp.repository.js';
import { hashPassword, verifyPassword } from './password.js';
import { SessionsRepository } from './sessions.repository.js';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
/** The stored form of a code, tied to its phone and purpose. */
const codeHash = (phone: string, purpose: OtpPurpose, code: string) => sha256(`${phone}:${purpose}:${code}`);

/** What the access token and the sign-up ticket carry. `typ` keeps one from passing as the other. */
export interface AccessPayload {
  typ: 'access';
  sub: number;
  role: string;
  /** Issue time in ms, compared with credentialsChangedAt. */
  iatMs: number;
}
interface TicketPayload {
  typ: 'ticket';
  purpose: OtpPurpose;
  phone: string;
  email: string;
}

const TICKET_TTL = '15m';

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersRepository,
    private readonly profiles: UsersService,
    private readonly otps: OtpRepository,
    private readonly sessions: SessionsRepository,
    private readonly jwt: JwtService,
    private readonly mailer: Mailer,
  ) {}

  /** Step 1 of sign-up: the phone and email must be new; the code goes to the email. */
  async sendSignupCode(phone: string, email: string): Promise<OtpSent> {
    if (await this.users.phoneInUse(phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    if (await this.users.emailInUse(email)) {
      throw new ApiException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'This email already has an account');
    }
    await this.sendCode(phone, email, 'signup');
    return { email, resendIn: OTP.resendSeconds };
  }

  /** "نسيت كلمة المرور؟": customers only; partners and drivers ask the admin (contract §2). */
  async sendResetCode(phone: string): Promise<OtpSent> {
    const user = await this.users.findLiveByPhone(phone);
    if (!user) throw new ApiException(HttpStatus.NOT_FOUND, 'PHONE_NOT_FOUND', 'No account has this phone');
    if (user.role !== 'customer' || !user.email) {
      throw new ApiException(HttpStatus.FORBIDDEN, 'STAFF_RESET_BY_ADMIN', 'Ask the admin to reset your password');
    }
    if (user.disabledAt) throw new ApiException(HttpStatus.FORBIDDEN, 'ACCOUNT_DISABLED', 'This account is disabled');
    await this.sendCode(phone, user.email, 'reset');
    return { email: maskEmail(user.email), resendIn: OTP.resendSeconds };
  }

  /** Step 2: the 4 digits. A right code gives a ticket for step 3 (or the new password). */
  async verifyCode(phone: string, purpose: OtpPurpose, code: string): Promise<OtpVerified> {
    const row = await this.otps.latest(phone, purpose);
    const result = row ? checkCode(row, codeHash(phone, purpose, code), new Date()) : 'expired';
    if (result === 'expired' || !row) throw new ApiException(HttpStatus.BAD_REQUEST, 'OTP_EXPIRED', 'The code has expired');
    if (result === 'locked') throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, 'OTP_LOCKED', 'Too many wrong codes');
    if (result === 'wrong') {
      await this.otps.addAttempt(row.id);
      const triesLeft = Math.max(0, OTP.maxAttempts - row.attempts - 1);
      throw new ApiException(HttpStatus.BAD_REQUEST, 'OTP_WRONG', 'Wrong code', { triesLeft });
    }
    if (!(await this.otps.consume(row.id))) throw new ApiException(HttpStatus.BAD_REQUEST, 'OTP_EXPIRED', 'The code has expired');
    const payload: TicketPayload = { typ: 'ticket', purpose, phone, email: row.email };
    return { ticket: await this.jwt.signAsync(payload, { expiresIn: TICKET_TTL }) };
  }

  /** Step 3: التفاصيل الشخصية. Creates the customer and signs them in. */
  async signup(body: SignupDto): Promise<AuthResponse> {
    const ticket = await this.readTicket(body.ticket, 'signup');
    // Someone may have taken the phone or email since the code was sent.
    if (await this.users.phoneInUse(ticket.phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    if (await this.users.emailInUse(ticket.email)) {
      throw new ApiException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'This email already has an account');
    }
    let invitedById: number | null = null;
    if (body.inviteCode) {
      const friend = await this.users.findByInviteCode(body.inviteCode);
      if (!friend || friend.role !== 'customer') {
        throw new ApiException(HttpStatus.BAD_REQUEST, 'INVITE_CODE_INVALID', 'No customer has this invite code');
      }
      invitedById = friend.id;
    }
    const id = await this.users.create({
      role: 'customer',
      phone: ticket.phone,
      email: ticket.email,
      firstName: body.firstName,
      lastName: body.lastName,
      passwordHash: await hashPassword(body.password),
      inviteCode: await this.profiles.uniqueInviteCode(),
      invitedById,
    });
    return this.issue(id);
  }

  /** Sets the new password after the emailed code; every older session ends. */
  async resetPassword(body: ResetPasswordDto): Promise<AuthResponse> {
    const ticket = await this.readTicket(body.ticket, 'reset');
    const user = await this.users.findLiveByPhone(ticket.phone);
    if (!user || user.role !== 'customer') throw this.badTicket();
    const changedAt = new Date();
    await this.users.update(user.id, { passwordHash: await hashPassword(body.password), credentialsChangedAt: changedAt });
    await this.sessions.revokeAllForUser(user.id);
    // The new access token must be issued after the change, or the guard would refuse it too.
    while (Date.now() <= changedAt.getTime()) await new Promise((r) => setTimeout(r, 1));
    return this.issue(user.id);
  }

  /** Every role signs in with phone + password (contract §2). */
  async login(body: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findLiveByPhone(body.phone);
    // Same answer for an unknown phone and a wrong password.
    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, 'BAD_CREDENTIALS', 'Wrong phone or password');
    }
    if (user.disabledAt) throw new ApiException(HttpStatus.FORBIDDEN, 'ACCOUNT_DISABLED', 'This account is disabled');
    return this.issue(user.id);
  }

  /** Rotates the refresh token. A token used twice means it was copied: every session ends. */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const row = await this.sessions.findByHash(sha256(refreshToken));
    if (!row || row.expiresAt.getTime() < Date.now()) throw this.sessionExpired();
    if (row.revokedAt || !(await this.sessions.revoke(row.id))) {
      await this.sessions.revokeAllForUser(row.userId);
      throw this.sessionExpired();
    }
    const user = await this.users.findLiveById(row.userId);
    if (!user || user.disabledAt) throw this.sessionExpired();
    return this.issue(row.userId);
  }

  async logout(refreshToken: string): Promise<void> {
    const row = await this.sessions.findByHash(sha256(refreshToken));
    if (row) await this.sessions.revoke(row.id);
  }

  private async sendCode(phone: string, email: string, purpose: OtpPurpose): Promise<void> {
    const now = new Date();
    const wait = resendWait((await this.otps.latest(phone, purpose))?.createdAt, now);
    if (wait > 0) {
      throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, 'OTP_TOO_SOON', 'Wait before asking for another code', { retryIn: wait });
    }
    const code = newCode();
    await this.otps.create({
      phone,
      email,
      purpose,
      codeHash: codeHash(phone, purpose, code),
      expiresAt: new Date(now.getTime() + OTP.validSeconds * 1000),
      createdAt: now,
    });
    // Sent in the background: a mail server's failure is logged, and the user can resend.
    this.mailer.send(otpMail(email, code)).catch((err: unknown) => this.log.error(`Code email to ${email} failed: ${String(err)}`));
  }

  private async readTicket(token: string, purpose: OtpPurpose): Promise<TicketPayload> {
    const payload = await this.jwt.verifyAsync<TicketPayload>(token).catch(() => undefined);
    if (payload?.typ !== 'ticket' || payload.purpose !== purpose) throw this.badTicket();
    return payload;
  }

  private badTicket() {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'TICKET_INVALID', 'Start again: the code check has expired');
  }

  private sessionExpired() {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'Session expired, please sign in again');
  }

  private async issue(userId: number): Promise<AuthResponse> {
    const row = await this.users.findLiveById(userId);
    if (!row) throw this.sessionExpired();
    const payload: AccessPayload = { typ: 'access', sub: row.id, role: row.role, iatMs: Date.now() };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: AUTH.accessTokenTtl });
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);

    const refreshToken = randomBytes(32).toString('base64url');
    await this.sessions.create(row.id, sha256(refreshToken), new Date(Date.now() + AUTH.refreshTokenDays * 86_400_000));
    return { user: toMe(row), accessToken, refreshToken, expiresIn: exp - iat };
  }
}
