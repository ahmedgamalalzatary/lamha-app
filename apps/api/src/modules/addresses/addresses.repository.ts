import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { users } from '../users/users.schema.js';
import { type AddressRow, addresses, type ZoneRow, zones } from './addresses.schema.js';

type AddressValues = Omit<typeof addresses.$inferInsert, 'id' | 'userId' | 'createdAt' | 'isDefault'>;

@Injectable()
export class AddressesRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  // Zones

  async listZones(activeOnly = false): Promise<ZoneRow[]> {
    return this.db
      .select()
      .from(zones)
      .where(activeOnly ? eq(zones.active, true) : undefined)
      .orderBy(asc(zones.id));
  }

  async findZone(id: number): Promise<ZoneRow | undefined> {
    const [row] = await this.db.select().from(zones).where(eq(zones.id, id));
    return row;
  }

  async createZone(values: typeof zones.$inferInsert): Promise<number> {
    const [res] = await this.db.insert(zones).values(values).$returningId();
    return res!.id;
  }

  async updateZone(id: number, values: Partial<typeof zones.$inferInsert>): Promise<void> {
    await this.db.update(zones).set(values).where(eq(zones.id, id));
  }

  // Addresses

  /** The default first, then the newest. */
  async listOf(userId: number): Promise<(AddressRow & { zoneName: string })[]> {
    const rows = await this.db
      .select({ address: addresses, zoneName: zones.name })
      .from(addresses)
      .innerJoin(zones, eq(zones.id, addresses.zoneId))
      .where(eq(addresses.userId, userId))
      .orderBy(desc(addresses.isDefault), desc(addresses.id));
    return rows.map((r) => ({ ...r.address, zoneName: r.zoneName }));
  }

  async findOf(userId: number, id: number): Promise<AddressRow | undefined> {
    const [row] = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
    return row;
  }

  /**
   * Saves an address. The customer's own account row is locked first (it always exists, unlike their
   * first address), so saves, deletes and the account's deletion take turns (review F04, F23): two
   * saves at once still leave exactly one default, the first address is the default, and a new
   * default takes over from the old. Undefined when the address (or the account) is gone (F22).
   */
  async save(userId: number, id: number | undefined, values: AddressValues, wantsDefault: boolean): Promise<number | undefined> {
    return this.db.transaction(async (tx) => {
      if (!(await lockLiveUser(tx, userId))) return undefined;
      const mine = await tx.select({ id: addresses.id, isDefault: addresses.isDefault }).from(addresses).where(eq(addresses.userId, userId)).for('update');
      if (id !== undefined && !mine.some((a) => a.id === id)) return undefined;
      const others = mine.filter((a) => a.id !== id);
      // Turning the default off is ignored: some address must stay the default.
      const isDefault = wantsDefault || !others.some((a) => a.isDefault);
      if (isDefault) await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, userId), id ? ne(addresses.id, id) : undefined));
      if (id) {
        await tx
          .update(addresses)
          .set({ ...values, isDefault })
          .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
        return id;
      }
      const [res] = await tx
        .insert(addresses)
        .values({ ...values, userId, isDefault })
        .$returningId();
      return res!.id;
    });
  }

  /** Deleting the default makes the newest one left the default. False when it is not theirs. */
  async delete(userId: number, id: number): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      if (!(await lockLiveUser(tx, userId))) return false;
      const mine = await tx.select({ id: addresses.id, isDefault: addresses.isDefault }).from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.id)).for('update');
      const gone = mine.find((a) => a.id === id);
      if (!gone) return false;
      await tx.delete(addresses).where(eq(addresses.id, id));
      const next = mine.find((a) => a.id !== id);
      if (gone.isDefault && next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
      return true;
    });
  }
}

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Locks the account's row until the transaction ends; false when the account is deleted. */
async function lockLiveUser(tx: Tx, userId: number): Promise<boolean> {
  const [row] = await tx
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .for('update');
  return !!row;
}
