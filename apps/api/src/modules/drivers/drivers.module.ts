import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { UsersModule } from '../users/users.module.js';
import { DriverSettingsService } from './driver-settings.service.js';
import { AdminDriverSettingsController, AdminDriversController, AdminOrderDriverController, DriverController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';

@Module({
  // Orders for the live socket (offers to every delivery man, changes to the store).
  imports: [UsersModule, OrdersModule],
  controllers: [DriverController, AdminDriversController, AdminOrderDriverController, AdminDriverSettingsController],
  providers: [DriversService, DriverSettingsService],
})
export class DriversModule {}
