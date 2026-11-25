import { Injectable } from '@nestjs/common';
import type { DeliverySettings } from '@tawsela/shared';
import { eq } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { deliverySettings, type DeliverySettingsRow } from './settings.schema.js';

const ROW = 1;

const toSettings = (row: DeliverySettingsRow): DeliverySettings => ({
  baseFee: row.baseFee,
  baseKm: row.baseKm,
  perKm: row.perKm,
  payoutOption: row.payoutOption,
  appPercent: row.appPercent,
});

/** الإعدادات › رسوم التوصيل والدفع (§8.7): the one row the migration made. */
@Injectable()
export class SettingsService {
  constructor(@InjectDb() private readonly db: Db) {}

  async delivery(tx: Db | Tx = this.db): Promise<DeliverySettings> {
    const [row] = await tx.select().from(deliverySettings).where(eq(deliverySettings.id, ROW));
    // The migration inserts the row; a database without it gets the defaults back.
    if (!row) {
      await tx.insert(deliverySettings).values({ id: ROW }).onDuplicateKeyUpdate({ set: { id: ROW } });
      return this.delivery(tx);
    }
    return toSettings(row);
  }

  async updateDelivery(change: Partial<DeliverySettings>): Promise<DeliverySettings> {
    await this.delivery();
    if (Object.keys(change).length) await this.db.update(deliverySettings).set(change).where(eq(deliverySettings.id, ROW));
    return this.delivery();
  }
}
