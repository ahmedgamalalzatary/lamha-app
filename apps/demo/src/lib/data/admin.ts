/*
 * Everything the admin controls lives here, so it can move to a backend later
 * without touching the screens: home tiles (order + images), banners, home
 * sections, per-store permissions, product layout per store type, and rider
 * shift rules.
 */
import type { Store, Vertical } from "../types";

const img = (n: string) => `/img/${n}.jpg`;

/** Home icon grid. Order in this array = order on screen. */
export type HomeTile = { id: string; label: string; img: string; href: string; badge?: string };
export const HOME_TILES: HomeTile[] = [
  { id: "food", label: "المطاعم", img: img("burger3"), href: "/app/restaurants" },
  { id: "mart", label: "لمحة ماركت", img: img("market1"), href: "/app/store/lamha-mart", badge: "سريع" },
  { id: "pharmacy", label: "صيدليات", img: img("pharmacy1"), href: "/app/pharmacy" },
  { id: "veg", label: "خضار وفاكهة", img: img("vegetables1"), href: "/app/store/lamha-mart#cat-m-veg" },
  { id: "sweets", label: "حلويات", img: img("cake1"), href: "/app/store/qarun-sweets", badge: "جديد" },
  { id: "sakia", label: "شاورما الساقية", img: img("shawarma1"), href: "/app/store/sakia-shawarma", badge: "الأكثر طلباً" },
  { id: "grill", label: "مشويات", img: img("grill2"), href: "/app/store/waha-grill" },
  { id: "send", label: "ابعت أي حاجة", img: img("delivery1"), href: "/app/send" },
  { id: "cafe", label: "قهوة", img: img("coffee2"), href: "/app/store/masalla-cafe" },
  { id: "juice", label: "عصاير", img: img("juice2"), href: "/app/store/nakhla-juice" },
];

/** Auto-sliding banners on home. `href` can point at any store or page. */
export type Banner = { id: string; title: string; sub: string; img: string; href: string; tone: string };
export const BANNERS: Banner[] = [
  { id: "b1", title: "عروض سماش لاب", sub: "خصم 20٪ على كل البرجر بكود LAMHA20", img: img("burger1"), href: "/app/store/smash-lab", tone: "#f55905" },
  { id: "b2", title: "فطار عم صابر", sub: "فطار العيلة كامل بـ 165 ج.م", img: img("taameya2"), href: "/app/store/am-saber", tone: "#2F5D2A" },
  { id: "b3", title: "كل احتياجات بيتك", sub: "لمحة ماركت يوصلك في 20 دقيقة", img: img("market1"), href: "/app/store/lamha-mart", tone: "#411517" },
  { id: "b4", title: "حلواني الفيوم", sub: "كنافة بالقشطة سخنة", img: img("kunafa1"), href: "/app/store/qarun-sweets", tone: "#8C1D4B" },
];

/** Colored store sections on home (Tawsilty style). */
export type HomeSection = { id: string; title: string; bg: string; ink: string; img: string; storeIds: string[] };
export const HOME_SECTIONS: HomeSection[] = [
  { id: "top", title: "🔥 الأكثر طلباً", bg: "#E8A33D", ink: "#262626", img: img("shawarma1"), storeIds: ["sakia-shawarma", "am-saber", "hadaqa-koshari", "smash-lab", "qarun-sweets", "waha-grill"] },
  { id: "taste", title: "جرب طعم المتعة", bg: "#8193E6", ink: "#1B2A6B", img: img("pizza1"), storeIds: ["qarun-pizza", "qarun-fish", "crepe-street", "masalla-cafe", "nakhla-juice", "green-bowl"] },
  { id: "new", title: "الجديد على لمحة", bg: "#4E9A82", ink: "#ffffff", img: img("seafood1"), storeIds: ["qarun-fish", "green-bowl", "crepe-street", "nakhla-juice"] },
];

/** The last section on home, in place of a full store list [Client: "مش عايز كل المطاعم", Tawsilty's "استمتع باختيارك 😍"]. */
export const HOME_LAST_SECTION: HomeSection = {
  id: "enjoy", title: "استمتع باختيارك 😍", bg: "#DCE8F4", ink: "#262626", img: img("burger1"),
  storeIds: ["qarun-pizza", "smash-lab", "sakia-shawarma", "am-saber", "waha-grill", "hadaqa-koshari", "qarun-sweets", "masalla-cafe", "crepe-street"],
};

/** A banner that opens the mart (or any store) directly, with a product row under it. */
export const MART_BANNER = { title: "كل احتياجات بيتك", sub: "منظفات • بقالة • أدوات منزلية", storeId: "lamha-mart", img: img("cleaning1") };

/** Product layout per store type. */
export const LAYOUT_BY_VERTICAL: Record<Vertical, "list" | "grid"> = { food: "list", mart: "grid", pharmacy: "grid" };

/** Stores allowed to offer "استلام من المحل". */
export const PICKUP_ALLOWED = new Set(["sakia-shawarma", "hadaqa-koshari", "am-saber", "masalla-cafe", "qarun-sweets", "nakhla-juice"]);

export const pickupAllowed = (s: Pick<Store, "id">) => PICKUP_ALLOWED.has(s.id);
export const layoutFor = (s: Pick<Store, "vertical">) => LAYOUT_BY_VERTICAL[s.vertical];

/** Rider shifts: the start button unlocks this many minutes before the shift. */
export const SHIFT_RULES = {
  unlockBeforeMin: 30,
  /** skips in a row before a warning, and before a temporary suspension */
  skipsWarn: 2,
  skipsSuspend: 3,
  suspendMin: 15,
  extendMin: 60,
};

/**
 * Money on a store's order (Tawsilty partner app). The store gets the items total minus the
 * platform commission, handed over by the driver ("استلم من المندوب"): 205 → 184.5, 95 → 85.5.
 */
export const ORDER_MONEY = {
  commission: 0.1,
  serviceFee: 10,
  /** e-wallet and card orders pay this share of the items total as "رسوم طريقة الدفع" */
  paymentFeeRate: 0.02,
  deliveryFees: [13, 17],
};

/** The store must press "تم التجهيز" this many minutes before the captain's pickup. */
export const PREP_BEFORE_PICKUP_MIN = 5;

/** Lucky wheel prizes (one spin per day). */
export type Prize = { id: string; label: string; kind: "points" | "promo" | "none"; value: number; code?: string };
export const WHEEL_PRIZES: Prize[] = [
  { id: "p25", label: "25 نقطة", kind: "points", value: 25 },
  { id: "d5", label: "خصم 5 ج.م", kind: "promo", value: 5, code: "SPIN5" },
  { id: "p50", label: "50 نقطة", kind: "points", value: 50 },
  { id: "d10", label: "خصم 10 ج.م", kind: "promo", value: 10, code: "SPIN10" },
  { id: "p100", label: "100 نقطة", kind: "points", value: 100 },
  { id: "free", label: "توصيل مجاني", kind: "promo", value: 0, code: "FAYOUM" },
  { id: "d20", label: "خصم 20 ج.م", kind: "promo", value: 20, code: "SPIN20" },
  { id: "none", label: "حظ أوفر", kind: "none", value: 0 },
];
