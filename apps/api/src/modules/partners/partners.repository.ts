import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, like, or, type SQL } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { stores } from '../catalog/catalog.schema.js';
import { type UserRow, users } from '../users/users.schema.js';

export interface PartnerRow {
  user: UserRow;
  store: { id: number; name: string };
}

/** Partner accounts with their store, for the admin's account lists (contract §11.2). */
@Injectable()
export class PartnersRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  /** Oldest first. `q` matches the name, the phone or the store's name. */
  async list(filter: { q?: string; storeId?: number } = {}): Promise<PartnerRow[]> {
    const where: (SQL | undefined)[] = [eq(users.role, 'partner'), isNull(users.deletedAt)];
    if (filter.storeId !== undefined) where.push(eq(users.storeId, filter.storeId));
    const q = filter.q?.trim();
    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      where.push(or(like(users.firstName, pattern), like(users.lastName, pattern), like(users.phone, pattern), like(stores.name, pattern)));
    }
    const rows = await this.db
      .select({ user: users, storeId: stores.id, storeName: stores.name })
      .from(users)
      .innerJoin(stores, eq(stores.id, users.storeId))
      .where(and(...where))
      .orderBy(asc(users.id));
    return rows.map((r) => ({ user: r.user, store: { id: r.storeId, name: r.storeName } }));
  }

  async find(id: number): Promise<PartnerRow | undefined> {
    const rows = await this.db
      .select({ user: users, storeId: stores.id, storeName: stores.name })
      .from(users)
      .innerJoin(stores, eq(stores.id, users.storeId))
      .where(and(eq(users.id, id), eq(users.role, 'partner'), isNull(users.deletedAt)));
    const r = rows[0];
    return r && { user: r.user, store: { id: r.storeId, name: r.storeName } };
  }
}
