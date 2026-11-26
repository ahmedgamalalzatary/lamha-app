import {
  type CatalogStore,
  type Category,
  type Cuisine,
  type DeliveryFeeRule,
  deliveryFeeFor,
  distanceKm,
  type HomeTile,
  type LatLng,
  type Ingredient,
  isOpenAt,
  type OptionGroup,
  type Product,
  type StoreInput,
  type StoreOffers,
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
    minimumOrder: row.minimumOrder,
    deliveredBy: row.deliveredBy,
    layout: row.layout,
    pickupAllowed: row.pickupAllowed,
    payoutOption: row.payoutOption,
    appPercent: row.appPercent,
    opensAt: hhmm(row.opensAt),
    closesAt: hhmm(row.closesAt),
    closedNow: row.closedNow,
    active: row.active,
    cuisineIds,
    zoneId: row.zoneId,
    location: locationOf(row),
    freeDeliveryFrom: row.freeDeliveryFrom,
    freeDeliveryPaidBy: row.freeDeliveryPaidBy,
  };
}

export const locationOf = (row: Pick<StoreRow, 'lat' | 'lng'>): LatLng | null =>
  row.lat === null || row.lng === null ? null : { lat: row.lat, lng: row.lng };

/**
 * The delivery fee to a spot (§8.7): straight line from the store. Without a spot, or without the
 * store's location, the lists show the base fee.
 */
export function feeFrom(row: Pick<StoreRow, 'lat' | 'lng'>, to: LatLng | undefined, rule: DeliveryFeeRule): number {
  const at = locationOf(row);
  return at && to ? deliveryFeeFor(distanceKm(at, to), rule) : rule.baseFee;
}

/** A store as the apps list it: the average of its ratings (§8.8), or "جديد" (null) with none. */
export function toCatalogStore(row: StoreRow, cuisineIds: number[], now: Date, deliveryFee: number, offers: StoreOffers): CatalogStore {
  return {
    id: row.id,
    vertical: row.vertical,
    name: row.name,
    logo: row.logo,
    cover: row.cover,
    deliveryMinutes: row.deliveryMinutes,
    deliveryFee,
    minimumOrder: row.minimumOrder,
    deliveredBy: row.deliveredBy,
    layout: row.layout,
    pickupAllowed: row.pickupAllowed,
    isOpen: storeIsOpen(row, now),
    rating: row.ratingCount ? Math.round((row.ratingSum / row.ratingCount) * 100) / 100 : null,
    ratingCount: row.ratingCount,
    cuisineIds,
    location: locationOf(row),
    offers,
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
  oldPrice: row.oldPrice,
  discountPaidBy: row.discountPaidBy,
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
