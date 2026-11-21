export type Vertical = "food" | "mart" | "pharmacy";

export type OptionChoice = { id: string; name: string; price: number };
export type OptionGroup = {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  choices: OptionChoice[];
};

export type MenuItem = {
  id: string;
  name: string;
  desc?: string;
  price: number;
  oldPrice?: number;
  img?: string;
  popular?: boolean;
  soldOut?: boolean;
  unit?: string;
  options?: OptionGroup[];
};

export type MenuCategory = { id: string; name: string; items: MenuItem[] };

export type Store = {
  id: string;
  name: string;
  vertical: Vertical;
  tags: string[];
  area: string;
  rating: number;
  ratingCount: number;
  etaMin: number;
  etaMax: number;
  deliveryFee: number;
  freeDeliveryOver?: number;
  minOrder: number;
  distanceKm: number;
  cover: string;
  mono: { letter: string; bg: string; fg: string };
  open: boolean;
  opensAt?: string;
  promo?: string;
  lamhaRider: boolean;
  payments: ("cash" | "card" | "wallet")[];
  coords: [number, number];
  menu: MenuCategory[];
};

export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  img?: string;
  basePrice: number;
  choices: OptionChoice[];
  qty: number;
  note?: string;
};

export type Promo = {
  code: string;
  label: string;
  kind: "percent" | "freeDelivery" | "flat";
  value: number;
  maxDiscount?: number;
  minSubtotal: number;
};

export type QuoteInput = {
  lines: CartLine[];
  store: Pick<Store, "deliveryFee" | "freeDeliveryOver" | "minOrder">;
  promo?: Promo | null;
  pointsToRedeem?: number;
  walletBalance?: number;
  useWallet?: boolean;
  tip?: number;
};

export type QuoteLine = {
  key: "subtotal" | "delivery" | "service" | "promo" | "points" | "tip";
  label: string;
  amount: number;
  note?: string;
  struck?: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  total: number;
  walletApplied: number;
  dueOnDelivery: number;
  belowMinimumBy: number;
  promoError?: string;
  pointsUsed: number;
};

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "pickedUp"
  | "delivered"
  | "cancelled";

export type RefundLine = { lineKey: string; amount: number; reason: string; at: number };

export type Order = {
  id: string;
  number: number;
  storeId: string;
  lines: CartLine[];
  quote: Quote;
  payment: "cash" | "card" | "wallet";
  addressLabel: string;
  addressText: string;
  placedAt: number;
  offsetMs: number;
  etaMinutes: number;
  cancelledAt?: number;
  refunds: RefundLine[];
  rated?: { store: number; rider: number; comment?: string };
  scheduledFor?: string;
  kind?: "store" | "courier";
  courier?: { from: string; to: string; what: string; size: string };
};
