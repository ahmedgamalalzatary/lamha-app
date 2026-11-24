import type { ResultSetHeader } from 'mysql2/promise';
import { sql } from './db';

/** A store row, as the seed or the admin's dashboard would make it. Open all day unless closedNow. */
export async function insertStore(
  name: string,
  vertical = 'restaurant',
  over: { deliveryMinutes?: number; closedNow?: boolean; pickupAllowed?: boolean } = {},
): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO stores (vertical, name, delivery_minutes, delivery_fee, minimum_order, layout, opens_at, closes_at, closed_now, pickup_allowed)
     VALUES (?, ?, ?, 15, 60, 'list', '00:00', '00:00', ?, ?)`,
    [vertical, name, over.deliveryMinutes ?? 25, over.closedNow ?? false, over.pickupAllowed ?? false],
  );
  return res.insertId;
}

/** A cuisine circle (§8.3), optionally on some stores. */
export async function insertCuisine(name: string, storeIds: number[] = [], sortOrder = 0): Promise<number> {
  const res = await sql<ResultSetHeader>('INSERT INTO cuisines (name, sort_order) VALUES (?, ?)', [name, sortOrder]);
  for (const storeId of storeIds) await sql('INSERT INTO store_cuisines (store_id, cuisine_id) VALUES (?, ?)', [storeId, res.insertId]);
  return res.insertId;
}

/** A product in a new category of the store. */
export async function insertProduct(storeId: number, name: string, price = 85): Promise<number> {
  const cat = await sql<ResultSetHeader>("INSERT INTO store_categories (store_id, name) VALUES (?, 'الكل')", [storeId]);
  const res = await sql<ResultSetHeader>('INSERT INTO products (store_id, category_id, name, price) VALUES (?, ?, ?, ?)', [
    storeId,
    cat.insertId,
    name,
    price,
  ]);
  return res.insertId;
}

/** A home tile (contract §8.2), as the admin's مربعات الرئيسية page makes it. */
export async function insertTile(
  label: string,
  tile: { row?: 'fixed' | 'scroll'; sortOrder?: number; badge?: string; vertical?: string; storeId?: number },
): Promise<number> {
  const res = await sql<ResultSetHeader>(
    'INSERT INTO home_tiles (label, badge, tile_row, sort_order, target_vertical, target_store_id) VALUES (?, ?, ?, ?, ?, ?)',
    [label, tile.badge ?? null, tile.row ?? 'fixed', tile.sortOrder ?? 0, tile.vertical ?? null, tile.storeId ?? null],
  );
  return res.insertId;
}

/** Puts a partner account on a store (contract §2). */
export async function linkPartner(userId: number, storeId: number): Promise<void> {
  await sql('UPDATE users SET store_id = ? WHERE id = ?', [storeId, userId]);
}
