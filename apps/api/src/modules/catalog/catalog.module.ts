import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { AdminCatalogService } from './admin-catalog.service.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogRepository } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [UsersModule, AddressesModule, SettingsModule],
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogRepository, CatalogService, AdminCatalogService],
  exports: [CatalogRepository, CatalogService, AdminCatalogService],
})
export class CatalogModule {}
