import { Module } from '@nestjs/common';
import { AdminPointsController, PointsController } from './points.controller.js';
import { PointsService } from './points.service.js';

@Module({ controllers: [PointsController, AdminPointsController], providers: [PointsService], exports: [PointsService] })
export class PointsModule {}
