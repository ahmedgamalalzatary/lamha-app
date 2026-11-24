import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Me, OtpSent } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthService } from './auth.service.js';
import { ChangeEmailDto, EmailDto } from './dto/auth.dto.js';

/**
 * Router for `/v1/me/email`: the profile's email field (contract §8.14). The recovery email moves only
 * with a code sent to the new address (review F01). Customers only; limited like the other code routes.
 */
@ApiTags('me')
@ApiBearerAuth()
@Roles('customer')
@UseGuards(ThrottlerGuard)
@Controller('me/email')
export class EmailChangeController {
  constructor(private readonly auth: AuthService) {}

  @Post('code')
  sendCode(@CurrentUser() user: AuthUser, @Body() body: EmailDto): Promise<OtpSent> {
    return this.auth.sendEmailChangeCode(user.id, body.email);
  }

  @Post()
  change(@CurrentUser() user: AuthUser, @Body() body: ChangeEmailDto): Promise<Me> {
    return this.auth.changeEmail(user.id, body.email, body.code);
  }
}
