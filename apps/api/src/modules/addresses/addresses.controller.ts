import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Address, Zone, ZoneCheck } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { AddressesService } from './addresses.service.js';
import { AddressDto, LatLngDto, UpdateZoneDto, ZoneDto } from './dto/addresses.dto.js';

/** Router for `/v1/me/addresses`: "العناوين المحفوظة" (§8.9). Customers only. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('customer')
@Controller('me/addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  /** The default first, then the newest. */
  @Get()
  list(@CurrentUser() me: AuthUser): Promise<Address[]> {
    return this.addresses.list(me.id);
  }

  /** 422 OUT_OF_ZONE when the spot is in no delivery zone. */
  @Post()
  create(@CurrentUser() me: AuthUser, @Body() body: AddressDto): Promise<Address> {
    return this.addresses.save(me.id, body);
  }

  @Put(':id')
  replace(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: AddressDto): Promise<Address> {
    return this.addresses.save(me.id, body, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.addresses.delete(me.id, id);
  }
}

/** Router for `/v1/zones/check`: the address form's "التوصيل متاح لهذا الموقع". Customers only. */
@ApiTags('me')
@ApiBearerAuth()
@Roles('customer')
@Controller('zones')
export class ZoneCheckController {
  constructor(private readonly addresses: AddressesService) {}

  @Post('check')
  @HttpCode(HttpStatus.OK)
  check(@Body() body: LatLngDto): Promise<ZoneCheck> {
    return this.addresses.check(body);
  }
}

/** Router for `/v1/admin/zones`: الإعدادات › المناطق. Zones are switched off, never deleted. Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/zones')
export class AdminZonesController {
  constructor(
    private readonly addresses: AddressesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(): Promise<Zone[]> {
    return this.addresses.listZones();
  }

  @Post()
  async create(@CurrentUser() me: AuthUser, @Body() body: ZoneDto): Promise<Zone> {
    const zone = await this.addresses.createZone(body);
    await this.audit.record(me.id, 'zone.create', { type: 'zone', id: zone.id, name: zone.name }, zoneDetails(body));
    return zone;
  }

  @Patch(':id')
  async update(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateZoneDto): Promise<Zone> {
    const zone = await this.addresses.updateZone(id, body);
    await this.audit.record(me.id, 'zone.update', { type: 'zone', id, name: zone.name }, zoneDetails(body));
    return zone;
  }
}

/** A zone change for the log: its outline as the corner count, not every coordinate. */
function zoneDetails({ polygon, ...rest }: UpdateZoneDto): Record<string, unknown> {
  return polygon ? { ...rest, corners: polygon.length } : { ...rest };
}
