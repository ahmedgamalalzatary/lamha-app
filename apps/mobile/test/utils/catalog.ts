import type { ResultSetHeader } from 'mysql2/promise';
import { sql } from './db';

/** A store row, as the seed or the admin's dashboard would make it. */
export async function insertStore(name: string, vertical = 'restaurant'): Promise<number> {
  const res = await sql<ResultSetHeader>(
    `INSERT INTO stores (vertical, name, delivery_minutes, delivery_fee, minimum_order, layout, opens_at, closes_at)
     VALUES (?, ?, 25, 15, 60, 'list', '00:00', '00:00')`,
    [vertical, name],
  );
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
