import { HttpStatus, Injectable } from '@nestjs/common';
import type { CatalogStore, Cuisine, HomeTile, StorePage, Vertical } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { CatalogRepository } from './catalog.repository.js';
import { toCatalogStore, toCategory, toCuisine, toHomeTile, toProduct } from './store-view.js';

/**
 * What the apps read (contract §8.2–§8.4): active stores, their categories and the products
 * customers may see. Phases 5–7 add the home sections, filters, sort and search on top.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly catalog: CatalogRepository) {}

  async stores(filter: { vertical?: Vertical; cuisineId?: number }): Promise<CatalogStore[]> {
    const rows = await this.catalog.listStores({ ...filter, activeOnly: true });
    const cuisineIds = await this.catalog.cuisineIdsOf(rows.map((r) => r.id));
    const now = new Date();
    return rows.map((row) => toCatalogStore(row, cuisineIds.get(row.id) ?? [], now));
  }

  /** A store page: categories in order, each with its active products; empty categories are left out. */
  async store(id: number): Promise<StorePage> {
    const row = await this.catalog.findStore(id);
    if (!row?.active) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No store has this id');
    const [cuisineIds, categories, products] = await Promise.all([
      this.catalog.cuisineIdsOf([id]),
      this.catalog.listCategories(id),
      this.catalog.listProducts(id, true),
    ]);
    return {
      ...toCatalogStore(row, cuisineIds.get(id) ?? [], new Date()),
      categories: categories
        .map((c) => {
          const items = products.filter((p) => p.categoryId === c.id).map(toProduct);
          return { ...toCategory(c, items.length), products: items };
        })
        .filter((c) => c.products.length > 0),
    };
  }

  async homeTiles(): Promise<HomeTile[]> {
    return (await this.catalog.listVisibleHomeTiles()).map(toHomeTile);
  }

  async cuisines(): Promise<Cuisine[]> {
    return (await this.catalog.listCuisines()).map(toCuisine);
  }
}
