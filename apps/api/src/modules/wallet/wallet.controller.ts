import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CustomerAccount, Wallet } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { CustomersQuery, WalletAdjustDto } from './wallet.dto.js';
import { WalletService } from './wallet.service.js';

/** حركة المحفظة (contract §8.15). Customers only. */
@ApiTags('wallet')
@ApiBearerAuth()
@Roles('customer')
@Controller('me/wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'The balance and its additions and deductions, newest first' })
  mine(@CurrentUser() me: AuthUser): Promise<Wallet> {
    return this.wallet.mine(me.id);
  }
}

/** العملاء and their wallets (contract §11 A3, A5). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(
    private readonly wallet: WalletService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  customers(@Query() query: CustomersQuery): Promise<CustomerAccount[]> {
    return this.wallet.customers(query.q);
  }

  @Post(':id/wallet')
  @ApiOperation({ summary: 'Add or deduct with a reason (422 WALLET_BALANCE: a deduction over the balance)' })
  async adjust(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: WalletAdjustDto): Promise<{ balance: number }> {
    const { balance, name } = await this.wallet.adjust(me.id, id, body);
    await this.audit.record(me.id, 'customer.wallet', { type: 'account', id, name }, { kind: body.kind, amount: body.amount, note: body.note, balance });
    return { balance };
  }
}
