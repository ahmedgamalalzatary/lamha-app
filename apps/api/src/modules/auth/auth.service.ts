import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH, type AuthResponse, maskEmail, type Me, OTP, type OtpPurpose, type OtpSent, type OtpVerified, type PhoneStatus } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { Mailer, type MailMessage } from '../../core/mail/mailer.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { toMe, UsersService } from '../users/users.service.js';
import type { LoginDto, ResetPasswordDto, SignupDto } from './dto/auth.dto.js';
import { emailChangedMail, otpMail } from './otp-mail.js';
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
  /** The account's session version at issue; the guard refuses the token once it moves on. */
  ver: number;
}
interface TicketPayload {
  typ: 'ticket';
  purpose: OtpPurpose;
  phone: string;
  email: string;
  /** Reset tickets only: the account the code was checked for, and its session version then. */
  sub?: number;
  ver?: number;
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
    private readonly notifications: NotificationsService,
  ) {}

  /** Tawsilty's phone step (contract §8.1): a live account on this phone means sign-in. */
  async checkPhone(phone: string): Promise<PhoneStatus> {
    return { registered: !!(await this.users.findLiveByPhone(phone)) };
  }

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
    const row = await this.useCode(phone, purpose, code);
    const payload: TicketPayload = { typ: 'ticket', purpose, phone, email: row.email };
    if (purpose === 'reset') {
      const user = await this.users.findLiveByPhone(phone);
      // The code went to the account's email of that moment: once the email changes, it is void.
      if (!user || user.email !== row.email) throw this.codeExpired();
      payload.sub = user.id;
      payload.ver = user.sessionVersion;
    }
    return { ticket: await this.jwt.signAsync(payload, { expiresIn: TICKET_TTL }) };
  }

  /**
   * The profile's "تغيير رقم الهاتف" (contract §8.14): a code for the new number, sent to the
   * account's email (no SMS, §8.1). Customers only.
   */
  async sendPhoneChangeCode(userId: number, phone: string): Promise<OtpSent> {
    const user = await this.users.findLiveById(userId);
    if (!user?.email) throw this.sessionExpired();
    if (await this.users.phoneInUse(phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    // Kept per account (its email): another customer asking for the same number has their own code.
    await this.sendCode(phone, user.email, 'phone', user.email);
    return { email: maskEmail(user.email), resendIn: OTP.resendSeconds };
  }

  /** The code from that email moves the account to the new number. */
  async changePhone(userId: number, phone: string, code: string): Promise<Me> {
    const user = await this.users.findLiveById(userId);
    if (!user?.email) throw this.sessionExpired();
    await this.useCode(phone, 'phone', code, user.email);
    if (await this.users.phoneInUse(phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    await this.users.update(user.id, { phone });
    return this.profiles.getMe(user.id);
  }

  /**
   * A new recovery email (contract §8.14, review F01): the code goes to the new address, so only its
   * owner can move the account there. Customers only.
   */
  async sendEmailChangeCode(userId: number, email: string): Promise<OtpSent> {
    const user = await this.users.findLiveById(userId);
    if (!user) throw this.sessionExpired();
    if (await this.users.emailInUse(email)) {
      throw new ApiException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'This email already has an account');
    }
    await this.sendCode(user.phone, email, 'email');
    return { email, resendIn: OTP.resendSeconds };
  }

  /** The code from the new address switches the email; the old address is told. */
  async changeEmail(userId: number, email: string, code: string): Promise<Me> {
    const user = await this.users.findLiveById(userId);
    if (!user) throw this.sessionExpired();
    // Only the code sent to this address: typing another address never uses up the real code.
    await this.useCode(user.phone, 'email', code, email);
    if (await this.users.emailInUse(email, user.id)) {
      throw new ApiException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'This email already has an account');
    }
    await this.users.update(user.id, { email });
    if (user.email && user.email !== email) this.mailInBackground(emailChangedMail(user.email, email));
    return this.profiles.getMe(user.id);
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
    return this.issue(id, 0);
  }

  /**
   * Sets the new password after the emailed code; every older session ends. The ticket is bound
   * to the account and its session version, so it works once and only for that account.
   */
  async resetPassword(body: ResetPasswordDto): Promise<AuthResponse> {
    const ticket = await this.readTicket(body.ticket, 'reset');
    if (ticket.sub === undefined || ticket.ver === undefined) throw this.badTicket();
    const user = await this.users.findLiveById(ticket.sub);
    if (!user || user.role !== 'customer' || user.phone !== ticket.phone || user.email !== ticket.email) throw this.badTicket();
    if (!(await this.users.resetPasswordAt(user.id, ticket.ver, await hashPassword(body.password)))) throw this.badTicket();
    await this.sessions.revokeAllForUser(user.id);
    return this.issue(user.id, ticket.ver + 1);
  }

  /** Every role signs in with phone + password (contract §2). */
  async login(body: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findLiveByPhone(body.phone);
    // Same answer for an unknown phone and a wrong password.
    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, 'BAD_CREDENTIALS', 'Wrong phone or password');
    }
    if (user.disabledAt) throw new ApiException(HttpStatus.FORBIDDEN, 'ACCOUNT_DISABLED', 'This account is disabled');
    // Issued only if the password checked here is still the account's (no reset landed meanwhile).
    return this.issue(user.id, user.sessionVersion);
  }

  /**
   * Rotates the refresh token. A token used twice means it was copied: every session ends, access
   * tokens too. The new token keeps the old one's session version, so a rotation racing a reset,
   * a disable or that alarm is refused.
   *
   * One exception (review F08): a device that never got the answer sends the old token again. Within
   * AUTH.refreshGraceSeconds, while the token it was rotated into is still unused, that token is
   * swapped for a fresh one instead of ending every session.
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const row = await this.sessions.findByHash(sha256(refreshToken));
    if (!row || row.expiresAt.getTime() < Date.now()) throw this.sessionExpired();
    if (!row.revokedAt && (await this.sessions.revoke(row.id))) return this.issue(row.userId, row.sessionVersion, row.id);
    if (await this.retryWithinGrace(row)) return this.issue(row.userId, row.sessionVersion, row.id);
    await this.users.endSessions(row.userId);
    await this.sessions.revokeAllForUser(row.userId);
    throw this.sessionExpired();
  }

  /**
   * Whether `row`'s replacement is fresh and unused; if so it is revoked, to be issued again. A
   * renewal of the same token at the same moment (two tabs) may still be making that replacement:
   * its link is waited for briefly before the token counts as copied.
   */
  private async retryWithinGrace(row: { id: number; replacedById: number | null; revokedAt: Date | null }): Promise<boolean> {
    let replacedById = row.replacedById;
    // Only a token revoked a moment ago can still be getting its replacement: one that was still live
    // when this renewal read it (another renewal won the race), or revoked in the last 2 seconds.
    const justRevoked = !row.revokedAt || Date.now() - row.revokedAt.getTime() < 2000;
    for (let wait = 0; !replacedById && justRevoked && wait < 10; wait++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      replacedById = (await this.sessions.find(row.id))?.replacedById ?? null;
    }
    if (!replacedById) return false;
    const next = await this.sessions.find(replacedById);
    if (!next || next.revokedAt || Date.now() - next.createdAt.getTime() > AUTH.refreshGraceSeconds * 1000) return false;
    return this.sessions.revoke(next.id);
  }

  /** Ends this session; with the phone's push token, that phone stops getting this account's pushes. */
  async logout(refreshToken: string, pushToken?: string): Promise<void> {
    const row = await this.sessions.findByHash(sha256(refreshToken));
    if (!row) return;
    await this.sessions.revoke(row.id);
    if (pushToken) await this.notifications.removeToken(row.userId, pushToken);
  }

  /** `owner`: the account's email, when the code is kept per account (a phone change). */
  private async sendCode(phone: string, email: string, purpose: OtpPurpose, owner?: string): Promise<void> {
    const now = new Date();
    const wait = resendWait((await this.otps.latest(phone, purpose, owner))?.createdAt, now);
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
    this.mailInBackground(otpMail(email, code));
  }

  /** Sent in the background: a mail server's failure is logged, and the user can resend. */
  private mailInBackground(message: MailMessage): void {
    this.mailer.send(message).catch((err: unknown) => this.log.error(`Email to ${message.to} failed: ${String(err)}`));
  }

  /**
   * Checks a code and uses it up. Each try is counted before the answer counts, so guesses sent at
   * the same moment still share the 5 tries.
   */
  private async useCode(phone: string, purpose: OtpPurpose, code: string, owner?: string) {
    const locked = () => new ApiException(HttpStatus.TOO_MANY_REQUESTS, 'OTP_LOCKED', 'Too many wrong codes');
    const row = await this.otps.latest(phone, purpose, owner);
    const result = row ? checkCode(row, codeHash(phone, purpose, code), new Date()) : 'expired';
    if (result === 'expired' || !row) throw this.codeExpired();
    if (result === 'locked') throw locked();
    if (!(await this.otps.takeAttempt(row.id))) throw (await this.otps.find(row.id))?.consumedAt ? this.codeExpired() : locked();
    if (result === 'wrong') {
      const triesLeft = Math.max(0, OTP.maxAttempts - ((await this.otps.find(row.id))?.attempts ?? OTP.maxAttempts));
      throw new ApiException(HttpStatus.BAD_REQUEST, 'OTP_WRONG', 'Wrong code', { triesLeft });
    }
    if (!(await this.otps.consume(row.id))) throw this.codeExpired();
    return row;
  }

  private codeExpired() {
    return new ApiException(HttpStatus.BAD_REQUEST, 'OTP_EXPIRED', 'The code has expired');
  }

  private async readTicket(token: string, purpose: OtpPurpose): Promise<TicketPayload> {
    const payload = await this.jwt.verifyAsync<TicketPayload>(token).catch(() => undefined);
    if (payload?.typ !== 'ticket' || payload.purpose !== purpose) throw this.badTicket();
    return payload;
  }

  private badTicket() {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'TICKET_INVALID', 'Start again: the code check has expired');
  }

  /** "Session expired": for a renewal that brought no token at all. */
  sessionExpiredError() {
    return this.sessionExpired();
  }

  private sessionExpired() {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'Session expired, please sign in again');
  }

  /**
   * A session at the account's session version `version`; refused if the account moved past it.
   * `rotatedFrom`: the refresh token it replaces, which remembers it for the grace retry.
   */
  private async issue(userId: number, version: number, rotatedFrom?: number): Promise<AuthResponse> {
    const row = await this.users.findLiveById(userId);
    if (!row) throw this.sessionExpired();
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + AUTH.refreshTokenDays * 86_400_000);
    const id = await this.sessions.create(row.id, version, sha256(refreshToken), expiresAt);
    if (id === undefined) throw this.sessionExpired();
    if (rotatedFrom !== undefined) await this.sessions.setReplacedBy(rotatedFrom, id);

    const payload: AccessPayload = { typ: 'access', sub: row.id, role: row.role, ver: version };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: AUTH.accessTokenTtl });
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return { user: toMe(row), accessToken, refreshToken, expiresIn: exp - iat };
  }
}
