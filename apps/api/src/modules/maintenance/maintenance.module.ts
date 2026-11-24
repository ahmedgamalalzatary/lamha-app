import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RetentionService } from './retention.service.js';

/** Background jobs that keep the database tidy. */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [RetentionService],
})
export class MaintenanceModule {}
