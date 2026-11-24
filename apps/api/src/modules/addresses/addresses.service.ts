import { HttpStatus, Injectable } from '@nestjs/common';
import { type Address, type LatLng, type Zone, type ZoneCheck, zoneAt } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { AddressesRepository } from './addresses.repository.js';
import type { AddressRow, ZoneRow } from './addresses.schema.js';
import type { AddressDto, UpdateZoneDto, ZoneDto } from './dto/addresses.dto.js';

const notFound = (what: string) => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', `No ${what} has this id`);
const corners = (polygon: LatLng[]) => polygon.map(({ lat, lng }) => ({ lat, lng }));
const toZone = (row: ZoneRow): Zone => ({ id: row.id, name: row.name, polygon: row.polygon, active: row.active });

function toAddress(row: AddressRow, zoneName: string): Address {
  const { id, type, building, apartment, floor, street, landmark, phone, lat, lng, isDefault, zoneId } = row;
  return { id, type, building, apartment, floor, street, landmark, phone, lat, lng, isDefault, zone: { id: zoneId, name: zoneName } };
}

/** Saved addresses and delivery zones (contract §8.9). */
@Injectable()
export class AddressesService {
  constructor(private readonly repo: AddressesRepository) {}

  // Zones (الإعدادات › المناطق)

  async listZones(): Promise<Zone[]> {
    return (await this.repo.listZones()).map(toZone);
  }

  async createZone(body: ZoneDto): Promise<Zone> {
    const id = await this.repo.createZone({ ...body, polygon: corners(body.polygon) });
    return toZone((await this.repo.findZone(id))!);
  }

  async updateZone(id: number, body: UpdateZoneDto): Promise<Zone> {
    if (!(await this.repo.findZone(id))) throw notFound('zone');
    await this.repo.updateZone(id, { ...body, polygon: body.polygon && corners(body.polygon) });
    return toZone((await this.repo.findZone(id))!);
  }

  async assertZone(id: number): Promise<void> {
    if (!(await this.repo.findZone(id))) throw notFound('zone');
  }

  /** The switched-on zone a spot is in ("التوصيل متاح لهذا الموقع"). */
  async check(spot: LatLng): Promise<ZoneCheck> {
    const zone = zoneAt(spot, await this.repo.listZones(true));
    return { zone: zone ? { id: zone.id, name: zone.name } : null };
  }

  // Addresses

  async list(userId: number): Promise<Address[]> {
    return (await this.repo.listOf(userId)).map((row) => toAddress(row, row.zoneName));
  }

  /** Saves a new address (no id) or replaces one; refused when its spot is in no zone. */
  async save(userId: number, body: AddressDto, id?: number): Promise<Address> {
    if (id !== undefined && !(await this.repo.findOf(userId, id))) throw notFound('address');
    const { zone } = await this.check(body);
    if (!zone) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, 'OUT_OF_ZONE', 'Delivery is not available at this spot');
    const { isDefault, ...values } = body;
    const saved = await this.repo.save(userId, id, { ...values, zoneId: zone.id }, isDefault);
    return (await this.list(userId)).find((a) => a.id === saved)!;
  }

  async delete(userId: number, id: number): Promise<void> {
    if (!(await this.repo.delete(userId, id))) throw notFound('address');
  }

  /** The customer's own address, for listing the stores that deliver to it. */
  async findOf(userId: number, id: number): Promise<AddressRow> {
    const row = await this.repo.findOf(userId, id);
    if (!row) throw notFound('address');
    return row;
  }
}
