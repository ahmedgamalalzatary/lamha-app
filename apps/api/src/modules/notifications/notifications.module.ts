import { Global, Module } from '@nestjs/common';
import { AdminCampaignsController, NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

/** Global: orders and delivery men tell people of their changes without importing each other. */
@Global()
@Module({ controllers: [NotificationsController, AdminCampaignsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
