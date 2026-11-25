import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreatedAccount,
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
import { AssignDriverDto, DriverScheduleDto, DriverSettingsDto, DriversQuery } from './drivers.dto.js';
import { DriversService } from './drivers.service.js';

/** The delivery man's app (contract §10): his shift, the offers, and his orders. */
@ApiTags('driver')
@ApiBearerAuth()
@Roles('driver')
@Controller('driver')
export class DriverController {
  constructor(private readonly drivers: DriversService) {}

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
}

/** المندوبين (contract §11, §11.2): accounts, their own weeks, starting a shift for one. Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/drivers')
export class AdminDriversController {
  constructor(
    private readonly drivers: DriversService,
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
