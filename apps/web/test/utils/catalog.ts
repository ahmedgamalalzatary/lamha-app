import type { ResultSetHeader } from 'mysql2/promise';
import { sql } from './db';

/** A store row as the seed or the admin would make it; open all day unless told otherwise. */
export async function insertStore(
  values: Partial<{ name: string; vertical: string; closedNow: boolean; active: boolean; deliveryFee: number }> = {},
): Promise<number> {
  const vertical = values.vertical ?? 'restaurant';
  const res = await sql<ResultSetHeader>(
    `INSERT INTO stores (vertical, name, delivery_minutes, delivery_fee, minimum_order, layout, opens_at, closes_at, closed_now, active)
     VALUES (?, ?, 25, ?, 60, ?, '00:00', '00:00', ?, ?)`,
    [vertical, values.name ?? 'شاورما الساقية', values.deliveryFee ?? 15, vertical === 'restaurant' ? 'list' : 'grid', values.closedNow ?? false, values.active ?? true],
  );
  return res.insertId;
}

export async function insertCategory(storeId: number, name: string, sortOrder = 0): Promise<number> {
  return (await sql<ResultSetHeader>('INSERT INTO store_categories (store_id, name, sort_order) VALUES (?, ?, ?)', [storeId, name, sortOrder])).insertId;
}

export async function insertProduct(storeId: number, categoryId: number, name: string, price: number, active = true): Promise<number> {
  return (
    await sql<ResultSetHeader>('INSERT INTO products (store_id, category_id, name, price, active) VALUES (?, ?, ?, ?, ?)', [storeId, categoryId, name, price, active])
  ).insertId;
}

export async function linkPartner(userId: number, storeId: number): Promise<void> {
  await sql('UPDATE users SET store_id = ? WHERE id = ?', [storeId, userId]);
}
