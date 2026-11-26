import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AdminDriverMoney,
  type CreatedAccount,
  type DriverFine,
  type DriverHistory,
  type DriverMoney,
  type DriverPoints,
  DRIVER_ACTIONS,
  type DriverAccount,
  type DriverAction,
  type DriverOffer,
  type DriverOrder,
  type DriverOrderDetails,
  type DriverSettings,
  type DriverShiftState,
  type GeneratedPassword,
  type SkipResult,
} from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateAdminDto, SetDisabledDto } from '../admins/dto/admins.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { DriverMoneyService } from './driver-money.service.js';
import { AssignDriverDto, DriverFeeDto, DriverScheduleDto, DriverSettingsDto, DriversQuery, FineDto, HistoryQuery } from './dto/drivers.dto.js';
import { DriversService } from './drivers.service.js';

/** The delivery man's app (contract §10): his shift, the offers, and his orders. */
@ApiTags('driver')
@ApiBearerAuth()
@Roles('driver')
@Controller('driver')
export class DriverController {
  constructor(
    private readonly drivers: DriversService,
    private readonly money: DriverMoneyService,
  ) {}

  @Get('shift')
  @ApiOperation({ summary: 'His shift now or next, whether he can start it, extensions left, a block' })
  shift(@CurrentUser() me: AuthUser): Promise<DriverShiftState> {
    return this.drivers.state(me.id);
  }

  @Post('shift/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'From 30 min before the shift to 15 min after it starts; 409 SHIFT_NOT_OPEN otherwise' })
  start(@CurrentUser() me: AuthUser): Promise<DriverShiftState> {
    return this.drivers.start(me.id);
  }

  @Post('shift/extend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '+60 min, at most 3 times (409 EXTEND_LIMIT)' })
  extend(@CurrentUser() me: AuthUser): Promise<DriverShiftState> {
    return this.drivers.extend(me.id);
  }

  @Post('shift/end')
  @HttpCode(HttpStatus.OK)
  end(@CurrentUser() me: AuthUser): Promise<DriverShiftState> {
    return this.drivers.end(me.id);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Orders waiting for a delivery man; none off shift or while blocked' })
  offers(@CurrentUser() me: AuthUser): Promise<DriverOffer[]> {
    return this.drivers.offers(me.id);
  }

  @Post('offers/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'The first to accept takes it; the rest get 409 OFFER_TAKEN' })
  accept(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<DriverOrderDetails> {
    return this.drivers.accept(me.id, id);
  }

  @Post('offers/:id/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Counts a skip in a row: a warning after 2, a 15 min block after 3' })
  skip(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<SkipResult> {
    return this.drivers.skip(me.id, id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'الطلبات الحالية: his orders not yet delivered' })
  current(@CurrentUser() me: AuthUser): Promise<DriverOrder[]> {
    return this.drivers.current(me.id);
  }

  @Get('orders/:id')
  details(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<DriverOrderDetails> {
    return this.drivers.details(me.id, id);
  }

  @Post('orders/:id/:action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'arrived (at the store), out (خارج للتوصيل, once ready), delivered; 409 ORDER_STATUS otherwise' })
  step(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Param('action') action: string): Promise<DriverOrderDetails> {
    if (!(DRIVER_ACTIONS as readonly string[]).includes(action)) throw new NotFoundException();
    return this.drivers.step(me.id, id, action as DriverAction);
  }

  @Get('history')
  @ApiOperation({ summary: 'طلباتى: his finished orders placed in the Cairo days, with اجمالى الارباح and عدد الطلبات المكتملة' })
  history(@CurrentUser() me: AuthUser, @Query() query: HistoryQuery): Promise<DriverHistory> {
    return this.money.history(me.id, query.from, query.to);
  }

  @Get('money')
  @ApiOperation({ summary: 'فواتيري: earnings and speed points cash less fines, and the fines' })
  myMoney(@CurrentUser() me: AuthUser): Promise<DriverMoney> {
    return this.money.money(me.id);
  }

  @Get('points')
  @ApiOperation({ summary: 'نقاطي: speed points not yet paid out, the levels and the movements' })
  points(@CurrentUser() me: AuthUser): Promise<DriverPoints> {
    return this.money.points(me.id);
  }
}

/** المندوبين (contract §11, §11.2): accounts, their own weeks, starting a shift for one. Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/drivers')
export class AdminDriversController {
  constructor(
    private readonly drivers: DriversService,
    private readonly money: DriverMoneyService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@CurrentUser() me: AuthUser, @Query() query: DriversQuery): Promise<DriverAccount[]> {
    return this.drivers.list(me.id, query.q);
  }

  @Post()
  async create(@CurrentUser() me: AuthUser, @Body() body: CreateAdminDto): Promise<CreatedAccount> {
    const created = await this.drivers.create(me.id, body);
    await this.audit.recordAccount(me.id, 'driver.create', created.account.id, { phone: created.account.phone });
    return created;
  }

  @Post(':id/password')
  async resetPassword(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<GeneratedPassword> {
    const generated = await this.drivers.resetPassword(id);
    await this.audit.recordAccount(me.id, 'driver.password', id);
    return generated;
  }

  @Patch(':id')
  async setDisabled(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: SetDisabledDto): Promise<DriverAccount> {
    const account = await this.drivers.setDisabled(me.id, id, body.disabled);
    await this.audit.recordAccount(me.id, body.disabled ? 'driver.disable' : 'driver.enable', id);
    return account;
  }

  @Put(':id/schedule')
  @ApiOperation({ summary: 'His own week, or null to follow the global one' })
  async schedule(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: DriverScheduleDto): Promise<DriverAccount> {
    const account = await this.drivers.setSchedule(me.id, id, body.schedule);
    await this.audit.recordAccount(me.id, 'driver.schedule', id, { schedule: body.schedule });
    return account;
  }

  @Put(':id/fee')
  @ApiOperation({ summary: 'His own fee rule for his earnings (§8.7); null earns the fee the customer pays' })
  async fee(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: DriverFeeDto): Promise<DriverAccount> {
    const account = await this.drivers.setFee(me.id, id, body.fee);
    await this.audit.recordAccount(me.id, 'driver.fee', id, { fee: body.fee });
    return account;
  }

  @Get(':id/money')
  @ApiOperation({ summary: 'His فواتيري, fines and speed points balance' })
  adminMoney(@Param('id', ParseIntPipe) id: number): Promise<AdminDriverMoney> {
    return this.money.adminMoney(id);
  }

  @Post(':id/fines')
  @ApiOperation({ summary: 'A fine with its reason, maybe about one of his orders; he is told' })
  async fine(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: FineDto): Promise<DriverFine> {
    const fine = await this.money.fine(me.id, id, body);
    await this.audit.recordAccount(me.id, 'driver.fine', id, { amount: fine.amount, reason: fine.reason, orderId: fine.order?.id ?? null });
    return fine;
  }

  @Delete(':id/fines/:fineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFine(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Param('fineId', ParseIntPipe) fineId: number): Promise<void> {
    const fine = await this.money.removeFine(id, fineId);
    await this.audit.recordAccount(me.id, 'driver.fine.delete', id, { amount: fine.amount, reason: fine.reason });
  }

  @Post(':id/payouts')
  @ApiOperation({ summary: 'تم الصرف: pays out his whole speed points balance in cash (409 NO_POINTS without one)' })
  async payout(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<{ points: number; value: number }> {
    const paid = await this.money.payout(me.id, id);
    await this.audit.recordAccount(me.id, 'driver.payout', id, paid);
    return paid;
  }

  @Post(':id/shift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start his shift after his own window closed (409 SHIFT_NOT_OPEN when there is none to start)' })
  async startShift(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<DriverAccount> {
    const account = await this.drivers.startFor(me.id, id);
    await this.audit.recordAccount(me.id, 'driver.shift', id);
    return account;
  }
}

/** The 🛵 in الطلبات: give an order to a delivery man. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/orders')
export class AdminOrderDriverController {
  constructor(
    private readonly drivers: DriversService,
    private readonly audit: AuditService,
  ) {}

  @Post(':id/driver')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'An accepted delivery before it leaves the store; 409 ORDER_STATUS otherwise' })
  async assign(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: AssignDriverDto): Promise<void> {
    await this.drivers.assign(id, body.driverId);
    await this.audit.record(me.id, 'order.assign', { type: 'order', id, name: `#${100000 + id}` }, { driverId: body.driverId });
  }
}

/** الإعدادات of the drivers: the global week and the rules (§15.1 #5). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings/drivers')
export class AdminDriverSettingsController {
  constructor(
    private readonly drivers: DriversService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  get(): Promise<DriverSettings> {
    return this.drivers.settingsOf();
  }

  @Patch()
  async update(@CurrentUser() me: AuthUser, @Body() body: DriverSettingsDto): Promise<DriverSettings> {
    const saved = await this.drivers.updateSettings(body);
    await this.audit.record(me.id, 'settings.drivers', { type: 'settings', id: 2, name: 'نوبات العمل وقواعد المندوبين' }, { ...body });
    return saved;
  }
}
