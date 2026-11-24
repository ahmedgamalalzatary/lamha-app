import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CreatedAccount, GeneratedPassword, StaffAccount } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminsService } from './admins.service.js';
import { CreateAdminDto, SetDisabledDto } from './dto/admins.dto.js';

/** Router for `/v1/admin/admins`: the dashboard's admin accounts (A23). Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/admins')
export class AdminsController {
  constructor(
    private readonly admins: AdminsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@CurrentUser() me: AuthUser): Promise<StaffAccount[]> {
    return this.admins.list(me.id);
  }

  @Post()
  async create(@CurrentUser() me: AuthUser, @Body() body: CreateAdminDto): Promise<CreatedAccount> {
    const created = await this.admins.create(me.id, body);
    await this.audit.recordAccount(me.id, 'admin.create', created.account.id, { phone: created.account.phone });
    return created;
  }

  @Post(':id/password')
  async resetPassword(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<GeneratedPassword> {
    const generated = await this.admins.resetPassword(me.id, id);
    await this.audit.recordAccount(me.id, 'admin.password', id);
    return generated;
  }

  @Patch(':id')
  async setDisabled(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: SetDisabledDto): Promise<StaffAccount> {
    const account = await this.admins.setDisabled(me.id, id, body.disabled);
    await this.audit.recordAccount(me.id, body.disabled ? 'admin.disable' : 'admin.enable', id);
    return account;
  }
}
