import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CreatedAccount, GeneratedPassword, PartnerAccount } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { SetDisabledDto } from '../admins/dto/admins.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AdminPartnersService } from './admin-partners.service.js';
import { CreatePartnerDto, PartnersQuery } from './dto/partners.dto.js';

/** Router for `/v1/admin/partners`: partner accounts (contract §2, §11.2). Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/partners')
export class AdminPartnersController {
  constructor(
    private readonly partners: AdminPartnersService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@CurrentUser() me: AuthUser, @Query() query: PartnersQuery): Promise<PartnerAccount[]> {
    return this.partners.list(me.id, query);
  }

  @Post()
  async create(@CurrentUser() me: AuthUser, @Body() body: CreatePartnerDto): Promise<CreatedAccount> {
    const created = await this.partners.create(me.id, body);
    await this.audit.recordAccount(me.id, 'partner.create', created.account.id, { phone: created.account.phone, storeId: body.storeId });
    return created;
  }

  @Post(':id/password')
  async resetPassword(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<GeneratedPassword> {
    const generated = await this.partners.resetPassword(id);
    await this.audit.recordAccount(me.id, 'partner.password', id);
    return generated;
  }

  @Patch(':id')
  async setDisabled(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: SetDisabledDto): Promise<PartnerAccount> {
    const account = await this.partners.setDisabled(me.id, id, body.disabled);
    await this.audit.recordAccount(me.id, body.disabled ? 'partner.disable' : 'partner.enable', id);
    return account;
  }
}
