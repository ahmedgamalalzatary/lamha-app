import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminPartnersController } from './admin-partners.controller.js';
import { AdminPartnersService } from './admin-partners.service.js';
import { PartnerStoreController } from './partner-store.controller.js';
import { PartnerStoreGuard } from './guards/partner-store.guard.js';
import { PartnersRepository } from './partners.repository.js';

@Module({
  imports: [UsersModule, CatalogModule],
  controllers: [AdminPartnersController, PartnerStoreController],
  providers: [PartnersRepository, AdminPartnersService, PartnerStoreGuard],
})
export class PartnersModule {}
