import { PAYOUT_OPTIONS } from '@tawsela/shared';
import { decimal, int, mysqlEnum, mysqlTable, timestamp } from 'drizzle-orm/mysql-core';

const money = (name: string) => decimal(name, { precision: 10, scale: 2, mode: 'number' });

/**
 * الإعدادات › رسوم التوصيل والدفع (§8.7): one row (id 1). The delivery fee rule and who pays whom,
 * for every store without its own payment option. The migration inserts the row with these defaults.
 */
export const deliverySettings = mysqlTable('delivery_settings', {
  id: int('id', { unsigned: true }).primaryKey(),
  baseFee: money('base_fee').notNull().default(20),
  baseKm: decimal('base_km', { precision: 6, scale: 2, mode: 'number' }).notNull().default(2),
  perKm: money('per_km').notNull().default(10),
  payoutOption: mysqlEnum('payout_option', PAYOUT_OPTIONS).notNull().default('app_share'),
  appPercent: decimal('app_percent', { precision: 5, scale: 2, mode: 'number' }).notNull().default(10),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export type DeliverySettingsRow = typeof deliverySettings.$inferSelect;
