import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthResponse, OtpSent, OtpVerified, PhoneStatus } from '@tawsela/shared';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Env } from '../../core/config/env.js';
import { AuthService } from './auth.service.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie, wantsCookie } from './refresh-cookie.js';
import {
  LoginDto,
  PasswordCodeDto,
  PhoneDto,
  LogoutDto,
  RefreshDto,
  ResetPasswordDto,
  SignupCodeDto,
  SignupDto,
  VerifyCodeDto,
} from './dto/auth.dto.js';

/**
 * Router for `/v1/auth` (contract §8.1). Sign-in and code routes are limited per address
 * (AUTH.rateLimitPerMinute, contract §14); refresh and sign-out are not, as the apps call them.
 */
@ApiTags('auth')
@Public()
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Tawsilty's phone step: whether the phone has an account (limited like sign-in). */
  @Post('phone')
  checkPhone(@Body() body: PhoneDto): Promise<PhoneStatus> {
    return this.auth.checkPhone(body.phone);
  }

  @Post('signup/code')
  sendSignupCode(@Body() body: SignupCodeDto): Promise<OtpSent> {
    return this.auth.sendSignupCode(body.phone, body.email);
  }

  @Post('password/code')
  sendResetCode(@Body() body: PasswordCodeDto): Promise<OtpSent> {
    return this.auth.sendResetCode(body.phone);
  }

  @Post('code/verify')
  verify(@Body() body: VerifyCodeDto): Promise<OtpVerified> {
    return this.auth.verifyCode(body.phone, body.purpose, body.code);
  }

  @Post('signup')
  signup(@Body() body: SignupDto): Promise<AuthResponse> {
    return this.auth.signup(body);
  }

  @Post('password/reset')
  resetPassword(@Body() body: ResetPasswordDto): Promise<AuthResponse> {
    return this.auth.resetPassword(body);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponse> {
    return this.deliver(await this.auth.login(body), req, res);
  }

  /** The phone sends its token in the body; the dashboard's comes in its cookie (review F11). */
  @SkipThrottle()
  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponse> {
    const token = this.tokenOf(body, req);
    try {
      if (!token) throw this.auth.sessionExpiredError();
      return this.deliver(await this.auth.refresh(token), req, res);
    } catch (e) {
      if (wantsCookie(req)) clearRefreshCookie(res, this.secure);
      throw e;
    }
  }

  @SkipThrottle()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: LogoutDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = this.tokenOf(body, req);
    if (wantsCookie(req)) clearRefreshCookie(res, this.secure);
    if (token) await this.auth.logout(token, body.pushToken);
  }

  /** Over HTTPS only in production (the dev API is plain http). */
  private get secure(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  /** The body's token, or, for the dashboard only, the cookie's. */
  private tokenOf(body: RefreshDto, req: Request): string | undefined {
    return body.refreshToken || (wantsCookie(req) ? readRefreshCookie(req) : undefined);
  }

  /** For the dashboard, the refresh token moves into the cookie and leaves the body. */
  private deliver(auth: AuthResponse, req: Request, res: Response): AuthResponse {
    if (!wantsCookie(req)) return auth;
    setRefreshCookie(res, auth.refreshToken, this.secure);
    return { ...auth, refreshToken: '' };
  }
}
