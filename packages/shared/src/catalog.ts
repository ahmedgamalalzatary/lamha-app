// Catalog rules and API shapes (contract §8.3–§8.5, §11 الموردين, المنتجات والكتالوج).
import type { CreatedAccount, StaffAccount } from './auth.js';
import type { Vertical } from './enums.js';
import type { Ingredient, OptionGroup } from './product.js';

/** How a store page shows its products (contract §8.4, set by the admin per store). */
export const STORE_LAYOUTS = ['list', 'grid'] as const;
export type StoreLayout = (typeof STORE_LAYOUTS)[number];

/** "التوصيل بواسطة" on the store page (§8.4): the platform's captains or the store itself. */
export const DELIVERED_BY = ['platform', 'store'] as const;
export type DeliveredBy = (typeof DELIVERED_BY)[number];

/** The home screen's two rows of tiles (§8.2): the first is fixed, the second scrolls sideways. */
export const HOME_TILE_ROWS = ['fixed', 'scroll'] as const;
export type TileRow = (typeof HOME_TILE_ROWS)[number];

/** [Client] restaurants list their products, markets and pharmacies show a grid (§8.4). The admin can change it. */
export const defaultLayout = (vertical: Vertical): StoreLayout =>
  vertical === 'market' || vertical === 'pharmacy' ? 'grid' : 'list';

/** "HH:MM", 24-hour. */
export const isTimeOfDay = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/** "13:45" → 825 minutes after midnight. */
export function minuteOfDay(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Opening hours as the partner sets them (contract §11.1): one daily range in Cairo time, plus a
 * "closed now" switch. [Open] Tawsilty's hours screen is not captured, so one range covers every day.
 */
export interface StoreHours {
  opensAt: string;
  closesAt: string;
  closedNow: boolean;
}

/**
 * Whether the store takes orders at this minute of the Cairo day. A range may run past midnight
 * (18:00–02:00); the same opening and closing time means open all day.
 */
export function isOpenAt(hours: StoreHours, minute: number): boolean {
  if (hours.closedNow) return false;
  const open = minuteOfDay(hours.opensAt);
  const close = minuteOfDay(hours.closesAt);
  if (open === close) return true;
  return open < close ? minute >= open && minute < close : minute >= open || minute < close;
}

/** Limits for catalog text and images. */
export const CATALOG = {
  nameMaxLength: 120,
  descriptionMaxLength: 1000,
  unitMaxLength: 40,
  badgeMaxLength: 30,
  /** Uploaded images keep at most this many pixels on the longest side. */
  imagePx: 1600,
  /** Before resizing. */
  uploadMaxBytes: 8 * 1024 * 1024,
} as const;

/** POST /v1/admin/uploads: where the stored image is served (a path under the API's origin). */
export interface UploadedImage {
  url: string;
}

/** What the admin sets on a store (contract §11 الموردين). */
export interface StoreInput extends StoreHours {
  vertical: Vertical;
  name: string;
  logo: string | null;
  cover: string | null;
  /** "مدة التوصيل" on the store page. */
  deliveryMinutes: number;
  deliveryFee: number;
  minimumOrder: number;
  deliveredBy: DeliveredBy;
  layout: StoreLayout;
  pickupAllowed: boolean;
  /** Hidden from customers when false. */
  active: boolean;
  cuisineIds: number[];
}

/** A store as the admin dashboard sees it. */
export interface AdminStore extends StoreInput {
  id: number;
  /** Open at this moment (hours and the "closed now" switch). */
  isOpen: boolean;
  /** The store's partner accounts (contract §2). */
  partners: StaffAccount[];
  productCount: number;
  createdAt: string;
}

/** GET /v1/partner/store: the signed-in partner's own store (contract §11.1). */
export type PartnerStore = Omit<AdminStore, 'partners'>;

/** POST /v1/admin/stores: the store and its generated partner account, password shown once. */
export interface CreatedStore {
  store: AdminStore;
  partner: CreatedAccount;
}

/** A partner account in the admin's account lists, with its store (contract §11.2). */
export interface PartnerAccount extends StaffAccount {
  store: { id: number; name: string };
}

/** A store as the apps list it (contract §8.3). */
export interface CatalogStore {
  id: number;
  vertical: Vertical;
  name: string;
  logo: string | null;
  cover: string | null;
  deliveryMinutes: number;
  deliveryFee: number;
  minimumOrder: number;
  deliveredBy: DeliveredBy;
  layout: StoreLayout;
  pickupAllowed: boolean;
  isOpen: boolean;
  /** null shows "جديد" until the store has ratings (Phase 14). */
  rating: number | null;
  ratingCount: number;
  cuisineIds: number[];
}

export interface Category {
  id: number;
  storeId: number;
  /**
   * A sub-category's main category: the market layout's category page shows the sub-categories as
   * circles (الكل, الخضار, الفاكهة…, §8.4). One level only; null for a main category.
   */
  parentId: number | null;
  name: string;
  /** The market layout's "الأقسام" grid shows it (§8.4). */
  image: string | null;
  sortOrder: number;
  productCount: number;
}

export interface Product {
  id: number;
  storeId: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  /** "كيلو", "شريط 20 قرص"… */
  unit: string | null;
  image: string | null;
  /** Off means "منتجات غير فعالة" (§11): the store page shows it greyed with "غير متوفر", and it cannot be ordered. */
  active: boolean;
  sortOrder: number;
  /** The product sheet's choices (§8.5), in order. */
  optionGroups: OptionGroup[];
  /** "المكونات الاساسية" (§8.5), in order. */
  ingredients: Ingredient[];
}

/** What the admin sets for a product's choices; saving replaces the old ones (§8.5). */
export interface ProductOptionsInput {
  optionGroups: { title: string; required: boolean; maxChoices: number; options: { name: string; priceDelta: number }[] }[];
  ingredients: string[];
}

/** A product in an admin list that spans stores (منتجات غير فعالة). */
export interface AdminProduct extends Product {
  storeName: string;
  categoryName: string;
}

/** GET /v1/catalog/stores/:id: the store with its categories and their active products. */
export interface StorePage extends CatalogStore {
  categories: (Category & { products: Product[] })[];
}

/** Cuisine circles on the restaurants list (§8.3). */
export interface Cuisine {
  id: number;
  name: string;
  image: string | null;
  sortOrder: number;
}

/** The invite card's rewards (§8.2, §8.17). Admin settings from Phase 18; these are Tawsilty's amounts. */
export interface InviteRewards {
  /** What the customer earns per friend. */
  reward: number;
  /** What the friend gets on signing up. */
  friendReward: number;
}

export const INVITE_REWARDS: InviteRewards = { reward: 300, friendReward: 25 };

/** GET /v1/catalog/home: what the customer home shows (§8.2). Banners and sections arrive in Phase 19. */
export interface HomeScreen {
  tiles: HomeTile[];
  invite: InviteRewards;
}

/** A home tile (§8.2): it opens a vertical's list or one pinned store. */
export interface HomeTile {
  id: number;
  label: string;
  image: string | null;
  /** "سريع", "الماكيز"… */
  badge: string | null;
  row: TileRow;
  sortOrder: number;
  targetVertical: Vertical | null;
  targetStoreId: number | null;
}
