import { Module } from '@nestjs/common';
import { AdminCustomersController, WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';

@Module({ controllers: [WalletController, AdminCustomersController], providers: [WalletService], exports: [WalletService] })
export class WalletModule {}
