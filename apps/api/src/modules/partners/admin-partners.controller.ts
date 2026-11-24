import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CreatedAccount, GeneratedPassword, PartnerAccount } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { SetDisabledDto } from '../admins/dto/admins.dto.js';
import { AdminPartnersService } from './admin-partners.service.js';
import { CreatePartnerDto, PartnersQuery } from './dto/partners.dto.js';

/** Router for `/v1/admin/partners`: partner accounts (contract §2, §11.2). Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/partners')
export class AdminPartnersController {
  constructor(private readonly partners: AdminPartnersService) {}

  @Get()
  list(@CurrentUser() me: AuthUser, @Query() query: PartnersQuery): Promise<PartnerAccount[]> {
    return this.partners.list(me.id, query);
  }

  @Post()
  create(@CurrentUser() me: AuthUser, @Body() body: CreatePartnerDto): Promise<CreatedAccount> {
    return this.partners.create(me.id, body);
  }

  @Post(':id/password')
  resetPassword(@Param('id', ParseIntPipe) id: number): Promise<GeneratedPassword> {
    return this.partners.resetPassword(id);
  }

  @Patch(':id')
  setDisabled(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: SetDisabledDto): Promise<PartnerAccount> {
    return this.partners.setDisabled(me.id, id, body.disabled);
  }
}
