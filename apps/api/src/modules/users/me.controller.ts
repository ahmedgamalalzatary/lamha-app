import { Body, Controller, Delete, Get, HttpCode, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Me } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { DeleteMeDto, UpdateMeDto } from './dto/me.dto.js';
import { UsersService } from './users.service.js';

/** Router for `/v1/me`: the signed-in account. */
@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  get(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() body: UpdateMeDto): Promise<Me> {
    return this.users.updateMe(user.id, body);
  }

  /** Customers only: partner and driver accounts are closed by the admin (contract §2). */
  @Delete()
  @Roles('customer')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Body() body: DeleteMeDto): Promise<void> {
    await this.users.deleteMe(user.id, body.password);
  }
}
