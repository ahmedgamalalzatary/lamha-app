import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Me, OtpSent } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuthService } from './auth.service.js';
import { ChangePhoneDto, PhoneDto } from './dto/auth.dto.js';

/**
 * Router for `/v1/me/phone`: the profile's "تغيير رقم الهاتف" sheet (contract §8.14). Customers only;
 * limited like the other code routes. The code goes to the account's email (§8.1, no SMS).
 */
@ApiTags('me')
@ApiBearerAuth()
@Roles('customer')
@UseGuards(ThrottlerGuard)
@Controller('me/phone')
export class PhoneChangeController {
  constructor(private readonly auth: AuthService) {}

  @Post('code')
  sendCode(@CurrentUser() user: AuthUser, @Body() body: PhoneDto): Promise<OtpSent> {
    return this.auth.sendPhoneChangeCode(user.id, body.phone);
  }

  @Post()
  change(@CurrentUser() user: AuthUser, @Body() body: ChangePhoneDto): Promise<Me> {
    return this.auth.changePhone(user.id, body.phone, body.code);
  }
}
