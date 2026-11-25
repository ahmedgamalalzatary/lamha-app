import {
  type CatalogStore,
  type Category,
  type Cuisine,
  type HomeTile,
  type Ingredient,
  isOpenAt,
  type OptionGroup,
  type Product,
  type StoreInput,
} from '@tawsela/shared';
import type { CategoryRow, CuisineRow, HomeTileRow, ProductRow, StoreRow } from './catalog.schema.js';

const cairoClock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Minutes after midnight in Cairo (contract §7: times are Africa/Cairo). */
export function cairoMinuteOfDay(now: Date): number {
  const parts = cairoClock.formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part('hour') * 60 + part('minute');
}

/** MySQL TIME comes back as "10:00:00"; the apps use "10:00". */
const hhmm = (time: string) => time.slice(0, 5);

export const storeIsOpen = (row: StoreRow, now: Date) =>
  isOpenAt({ opensAt: hhmm(row.opensAt), closesAt: hhmm(row.closesAt), closedNow: row.closedNow }, cairoMinuteOfDay(now));

/** The fields the admin sets, as the API sends them. */
export function toStoreInput(row: StoreRow, cuisineIds: number[]): StoreInput {
  return {
    vertical: row.vertical,
    name: row.name,
    logo: row.logo,
    cover: row.cover,
    deliveryMinutes: row.deliveryMinutes,
    deliveryFee: row.deliveryFee,
    minimumOrder: row.minimumOrder,
    deliveredBy: row.deliveredBy,
    layout: row.layout,
    pickupAllowed: row.pickupAllowed,
    opensAt: hhmm(row.opensAt),
    closesAt: hhmm(row.closesAt),
    closedNow: row.closedNow,
    active: row.active,
    cuisineIds,
    zoneId: row.zoneId,
    location: locationOf(row),
  };
}

const locationOf = (row: StoreRow) => (row.lat === null || row.lng === null ? null : { lat: row.lat, lng: row.lng });

/** A store as the apps list it. Ratings arrive in Phase 15; until then every store is "جديد". */
export function toCatalogStore(row: StoreRow, cuisineIds: number[], now: Date): CatalogStore {
  return {
    id: row.id,
    vertical: row.vertical,
    name: row.name,
    logo: row.logo,
    cover: row.cover,
    deliveryMinutes: row.deliveryMinutes,
    deliveryFee: row.deliveryFee,
    minimumOrder: row.minimumOrder,
    deliveredBy: row.deliveredBy,
    layout: row.layout,
    pickupAllowed: row.pickupAllowed,
    isOpen: storeIsOpen(row, now),
    rating: null,
    ratingCount: 0,
    cuisineIds,
    location: locationOf(row),
  };
}

export const toCategory = (row: CategoryRow, productCount: number): Category => ({
  id: row.id,
  storeId: row.storeId,
  parentId: row.parentId,
  name: row.name,
  image: row.image,
  sortOrder: row.sortOrder,
  productCount,
});

export interface Choices {
  optionGroups: OptionGroup[];
  ingredients: Ingredient[];
}

const NO_CHOICES: Choices = { optionGroups: [], ingredients: [] };

export const toProduct = (row: ProductRow, choices: Choices = NO_CHOICES): Product => ({
  ...choices,
  id: row.id,
  storeId: row.storeId,
  categoryId: row.categoryId,
  name: row.name,
  description: row.description,
  price: row.price,
  unit: row.unit,
  image: row.image,
  active: row.active,
  sortOrder: row.sortOrder,
});

export const toCuisine = (row: CuisineRow): Cuisine => ({ id: row.id, name: row.name, image: row.image, sortOrder: row.sortOrder });

export const toHomeTile = (row: HomeTileRow): HomeTile => ({
  id: row.id,
  label: row.label,
  image: row.image,
  badge: row.badge,
  row: row.row,
  sortOrder: row.sortOrder,
  targetVertical: row.targetVertical,
  targetStoreId: row.targetStoreId,
});
