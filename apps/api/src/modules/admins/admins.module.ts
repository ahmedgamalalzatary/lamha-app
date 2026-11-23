import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}
