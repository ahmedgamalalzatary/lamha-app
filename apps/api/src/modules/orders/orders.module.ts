import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module.js';
import { CartModule } from '../cart/cart.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminOrdersController, OrdersController, PartnerOrdersController } from './orders.controller.js';
import { OrdersGateway } from './orders.gateway.js';
import { OrdersService } from './orders.service.js';

@Module({
  // Users and Catalog for the partner store guard and the live socket's account check.
  imports: [CartModule, AddressesModule, SettingsModule, UsersModule, CatalogModule],
  controllers: [OrdersController, PartnerOrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
