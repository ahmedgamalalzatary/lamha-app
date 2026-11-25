import type { ResultSetHeader } from 'mysql2/promise';
import { sql } from './db.js';

/** A store row, as the seed or the admin would make it. Open all day unless told otherwise. */
export async function insertStore(
  values: Partial<{ name: string; vertical: string; active: boolean; opensAt: string; closesAt: string; closedNow: boolean; layout: string; deliveryMinutes: number; pickupAllowed: boolean }> = {},
): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO stores (vertical, name, delivery_minutes, minimum_order, layout, opens_at, closes_at, closed_now, active, pickup_allowed)
     VALUES (?, ?, ?, 60, ?, ?, ?, ?, ?, ?)`,
    [
      values.vertical ?? 'restaurant',
      values.name ?? 'شاورما الساقية',
      values.deliveryMinutes ?? 25,
      values.layout ?? 'list',
      values.opensAt ?? '00:00',
      values.closesAt ?? '00:00',
      values.closedNow ?? false,
      values.active ?? true,
      values.pickupAllowed ?? false,
    ],
  );
  return res.insertId;
}

export async function insertCategory(storeId: number, name = 'سندوتشات', sortOrder = 0): Promise<number> {
  const res = await sql<ResultSetHeader>('INSERT INTO store_categories (store_id, name, sort_order) VALUES (?, ?, ?)', [storeId, name, sortOrder]);
  return res.insertId;
}

export async function insertProduct(storeId: number, categoryId: number, name = 'شاورما فراخ', price = 85, active = true): Promise<number> {
  const res = await sql<ResultSetHeader>('INSERT INTO products (store_id, category_id, name, price, active) VALUES (?, ?, ?, ?, ?)', [
    storeId,
    categoryId,
    name,
    price,
    active,
  ]);
  return res.insertId;
}

/** Puts a partner account on a store (contract §2). */
export async function linkPartner(userId: number, storeId: number): Promise<void> {
  await sql('UPDATE users SET store_id = ? WHERE id = ?', [storeId, userId]);
}
