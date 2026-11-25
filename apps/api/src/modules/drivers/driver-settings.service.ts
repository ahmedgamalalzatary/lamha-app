import { Injectable } from '@nestjs/common';
import { type DriverSettings, WEEK_DAYS } from '@tawsela/shared';
import { eq } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { driverSettings } from './drivers.schema.js';

const ROW = 1;

/** The drivers' week and rules (§10, §15.1 #5): the one row the migration made. */
@Injectable()
export class DriverSettingsService {
  constructor(@InjectDb() private readonly db: Db) {}

  async get(tx: Db | Tx = this.db): Promise<DriverSettings> {
    const [row] = await tx.select().from(driverSettings).where(eq(driverSettings.id, ROW));
    // The migration inserts the row; a database without it gets the defaults (a week without shifts).
    if (!row) {
      await tx
        .insert(driverSettings)
        .values({ id: ROW, schedule: Array.from({ length: WEEK_DAYS }, () => null) })
        .onDuplicateKeyUpdate({ set: { id: ROW } });
      return this.get(tx);
    }
    const { id: _id, updatedAt: _updatedAt, ...settings } = row;
    return settings;
  }

  async update(change: Partial<DriverSettings>): Promise<DriverSettings> {
    await this.get();
    if (Object.keys(change).length) await this.db.update(driverSettings).set(change).where(eq(driverSettings.id, ROW));
    return this.get();
  }
}
