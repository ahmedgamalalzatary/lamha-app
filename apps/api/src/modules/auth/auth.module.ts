import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AUTH } from '@tawsela/shared';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { Env } from '../../core/config/env.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailChangeController } from './email-change.controller.js';
import { PhoneChangeController } from './phone-change.controller.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { OtpRepository } from './otp.repository.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({ secret: config.get('JWT_ACCESS_SECRET', { infer: true }) }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: AUTH.rateLimitPerMinute }],
      // e2e tests share one address; only the rate-limit test turns the limit on, with this header.
      skipIf: (ctx) =>
        process.env.NODE_ENV === 'test' && !ctx.switchToHttp().getRequest<{ headers: Record<string, unknown> }>().headers['x-test-rate-limit'],
    }),
  ],
  controllers: [AuthController, PhoneChangeController, EmailChangeController],
  providers: [
    AuthService,
    OtpRepository,
    // Order matters: who you are first, then what your role may do.
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
