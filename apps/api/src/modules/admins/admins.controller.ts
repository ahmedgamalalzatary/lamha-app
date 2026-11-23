import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CreatedAccount, GeneratedPassword, StaffAccount } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminsService } from './admins.service.js';
import { CreateAdminDto, SetDisabledDto } from './dto/admins.dto.js';

/** Router for `/v1/admin/admins`: the dashboard's admin accounts (A23). Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/admins')
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser): Promise<StaffAccount[]> {
    return this.admins.list(me.id);
  }

  @Post()
  create(@CurrentUser() me: AuthUser, @Body() body: CreateAdminDto): Promise<CreatedAccount> {
    return this.admins.create(me.id, body);
  }

  @Post(':id/password')
  resetPassword(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<GeneratedPassword> {
    return this.admins.resetPassword(me.id, id);
  }

  @Patch(':id')
  setDisabled(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: SetDisabledDto): Promise<StaffAccount> {
    return this.admins.setDisabled(me.id, id, body.disabled);
  }
}
