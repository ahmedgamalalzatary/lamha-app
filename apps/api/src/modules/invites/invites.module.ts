import { Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { AdminInvitesController, InvitesController } from './invites.controller.js';
import { InvitesService } from './invites.service.js';

@Module({
  imports: [WalletModule],
  controllers: [InvitesController, AdminInvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
