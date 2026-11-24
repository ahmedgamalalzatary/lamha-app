import { Injectable } from '@nestjs/common';
import { desc, eq, and } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { favoriteStores } from './favorites.schema.js';

@Injectable()
export class FavoritesRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  /** The customer's favourite store ids, the newest first. */
  async storeIdsOf(userId: number): Promise<number[]> {
    const rows = await this.db
      .select({ storeId: favoriteStores.storeId })
      .from(favoriteStores)
      .where(eq(favoriteStores.userId, userId))
      .orderBy(desc(favoriteStores.createdAt), desc(favoriteStores.storeId));
    return rows.map((r) => r.storeId);
  }

  /** Adding one twice keeps the first. */
  async add(userId: number, storeId: number): Promise<void> {
    await this.db.insert(favoriteStores).ignore().values({ userId, storeId });
  }

  async remove(userId: number, storeId: number): Promise<void> {
    await this.db.delete(favoriteStores).where(and(eq(favoriteStores.userId, userId), eq(favoriteStores.storeId, storeId)));
  }
}
