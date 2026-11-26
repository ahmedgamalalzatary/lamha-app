import { Module } from '@nestjs/common';
import { CatalogRepository } from '../catalog/catalog.repository.js';
import { AdminOffersController } from './offers.controller.js';
import { OffersService } from './offers.service.js';

@Module({
  controllers: [AdminOffersController],
  providers: [OffersService, CatalogRepository],
  exports: [OffersService],
})
export class OffersModule {}
