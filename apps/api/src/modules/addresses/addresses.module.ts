import { Module } from '@nestjs/common';
import { AddressesController, AdminZonesController, ZoneCheckController } from './addresses.controller.js';
import { AddressesRepository } from './addresses.repository.js';
import { AddressesService } from './addresses.service.js';

@Module({
  controllers: [AddressesController, ZoneCheckController, AdminZonesController],
  providers: [AddressesRepository, AddressesService],
  exports: [AddressesService, AddressesRepository],
})
export class AddressesModule {}
