import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Address, Zone, ZoneCheck } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
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
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  list(): Promise<Zone[]> {
    return this.addresses.listZones();
  }

  @Post()
  create(@Body() body: ZoneDto): Promise<Zone> {
    return this.addresses.createZone(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateZoneDto): Promise<Zone> {
    return this.addresses.updateZone(id, body);
  }
}
