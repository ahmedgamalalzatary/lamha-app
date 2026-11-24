import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { PartnerStore } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AdminCatalogService } from '../catalog/admin-catalog.service.js';
import type { StoreRow } from '../catalog/catalog.schema.js';
import { CurrentStore, PartnerArea } from './partner-store.guard.js';

/** Router for `/v1/partner/store`: the partner's own store (contract §11.1). Editing arrives in Phase 11. */
@ApiTags('partner')
@ApiBearerAuth()
@PartnerArea()
@Controller('partner/store')
export class PartnerStoreController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Get()
  async get(@CurrentUser() me: AuthUser, @CurrentStore() store: StoreRow): Promise<PartnerStore> {
    const { partners: _partners, ...own } = await this.catalog.getStore(me.id, store.id);
    return own;
  }
}
