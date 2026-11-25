import { Module } from '@nestjs/common';
import { AdminSettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

@Module({ controllers: [AdminSettingsController], providers: [SettingsService], exports: [SettingsService] })
export class SettingsModule {}
