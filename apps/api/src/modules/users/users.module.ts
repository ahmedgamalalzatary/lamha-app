import { Module } from '@nestjs/common';
import { AddressesModule } from '../addresses/addresses.module.js';
import { SessionsRepository } from '../auth/sessions.repository.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { MeController } from './me.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [UploadsModule, AddressesModule],
  controllers: [MeController],
  providers: [UsersService, UsersRepository, SessionsRepository],
  exports: [UsersService, UsersRepository, SessionsRepository],
})
export class UsersModule {}
