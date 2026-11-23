import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthResponse, OtpSent, OtpVerified } from '@tawsela/shared';
import { Public } from '../../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import {
  LoginDto,
  PasswordCodeDto,
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
  constructor(private readonly auth: AuthService) {}

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
  login(@Body() body: LoginDto): Promise<AuthResponse> {
    return this.auth.login(body);
  }

  @SkipThrottle()
  @Post('refresh')
  refresh(@Body() body: RefreshDto): Promise<AuthResponse> {
    return this.auth.refresh(body.refreshToken);
  }

  @SkipThrottle()
  @Post('logout')
  @HttpCode(204)
  async logout(@Body() body: RefreshDto): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}
