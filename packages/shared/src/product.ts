// Product sheet and store-page cart rules (contract §8.4 bottom bar, §8.5).

/** A choice in an option group: "ربع كيلو (+58.75 ج.م)". */
export interface ProductOption {
  id: number;
  name: string;
  /** Added to the product's price when chosen; 0 shows no "(+…)". */
  priceDelta: number;
}

/**
 * An option group (§8.5): "الوزن", a black "مطلوب" tag when required, "اختر 1" and radio rows.
 * [Open] Tawsilty only shows required "اختر 1" groups; optional groups and "اختر حتى N" are ours.
 */
export interface OptionGroup {
  id: number;
  title: string;
  required: boolean;
  /** 1 is a radio group ("اختر 1"); more lets the customer tick up to this many. */
  maxChoices: number;
  options: ProductOption[];
}

/** A base ingredient (§8.5 "المكونات الاساسية"): a chip the customer can strike out ("بدون"). */
export interface Ingredient {
  id: number;
  name: string;
}

/** What the sheet and the cart need from a product. */
export interface SheetProduct {
  id: number;
  price: number;
  optionGroups: OptionGroup[];
  ingredients: Ingredient[];
}

/** Limits for what the admin sets on a product. */
export const PRODUCT_OPTIONS = {
  maxGroups: 10,
  maxOptions: 30,
  maxIngredients: 30,
} as const;

/** How many products the "تُطلب معًا" row shows. */
export const ORDERED_TOGETHER = 10;

const cents = (n: number) => Math.round(n * 100) / 100;

/** "قابل للتخصيص" under the item and "‹" instead of "+": tapping opens the sheet. */
export const isCustomizable = (p: SheetProduct) => p.optionGroups.length > 0 || p.ingredients.length > 0;

/** "السعر حسب الاختيار": the product has no price of its own; a required choice sets it. */
export const priceByChoice = (p: SheetProduct) => p.price === 0 && p.optionGroups.some((g) => g.required);

/**
 * The chosen option ids after tapping one row. A one-choice group swaps its choice (a required one
 * keeps the tapped row chosen; an optional one clears it); a bigger group toggles, up to its limit.
 */
export function toggleChoice(p: SheetProduct, chosen: number[], groupId: number, optionId: number): number[] {
  const group = p.optionGroups.find((g) => g.id === groupId);
  if (!group?.options.some((o) => o.id === optionId)) return chosen;
  const inGroup = new Set(group.options.map((o) => o.id));
  const others = chosen.filter((id) => !inGroup.has(id));
  const mine = chosen.filter((id) => inGroup.has(id));
  if (mine.includes(optionId)) {
    if (group.maxChoices === 1 && group.required) return chosen;
    return chosen.filter((id) => id !== optionId);
  }
  if (group.maxChoices === 1) return [...others, optionId];
  if (mine.length >= group.maxChoices) return chosen;
  return [...chosen, optionId];
}

/** Every required group has a choice; until then the button is grey (§8.5). */
export const choicesComplete = (p: SheetProduct, chosen: number[]) =>
  p.optionGroups.every((g) => !g.required || g.options.some((o) => chosen.includes(o.id)));

/** One item's price: the product's price plus each chosen option's. */
export function unitPrice(p: SheetProduct, chosen: number[]): number {
  const extra = p.optionGroups.flatMap((g) => g.options).reduce((sum, o) => (chosen.includes(o.id) ? sum + o.priceDelta : sum), 0);
  return cents(p.price + extra);
}

/**
 * "تُطلب معًا" (§8.5): the products after this one in the store's menu, wrapping round to the start.
 * [Open] Tawsilty does not say how it picks them; its rows show the item's neighbours in the menu.
 */
export function orderedTogether<T extends { id: number }>(menu: T[], productId: number, limit: number = ORDERED_TOGETHER): T[] {
  const at = menu.findIndex((p) => p.id === productId);
  if (at === -1) return menu.slice(0, limit);
  return [...menu.slice(at + 1), ...menu.slice(0, at)].slice(0, limit);
}

/** A line in the cart: one product with one set of choices. */
export interface CartLine<P extends SheetProduct = SheetProduct> {
  key: string;
  product: P;
  optionIds: number[];
  /** Struck-out ingredients: "بدون: ٥ اسبايسي ليمون" in the cart (§8.5). */
  removedIngredientIds: number[];
  quantity: number;
  unitPrice: number;
}

export interface CartItem<P extends SheetProduct = SheetProduct> {
  product: P;
  optionIds: number[];
  removedIngredientIds: number[];
  quantity: number;
}

const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);

/** The same product with the same choices is the same line, whatever order they were picked in. */
export const lineKey = (productId: number, optionIds: number[], removedIngredientIds: number[]) =>
  `${productId}|${sorted(optionIds).join(',')}|${sorted(removedIngredientIds).join(',')}`;

/** The cart after adding: a matching line grows, otherwise a new line goes at the end. */
export function addToCart<P extends SheetProduct>(lines: CartLine<P>[], item: CartItem<P>): CartLine<P>[] {
  const key = lineKey(item.product.id, item.optionIds, item.removedIngredientIds);
  if (lines.some((l) => l.key === key)) {
    return lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + item.quantity } : l));
  }
  return [
    ...lines,
    {
      key,
      product: item.product,
      optionIds: sorted(item.optionIds),
      removedIngredientIds: sorted(item.removedIngredientIds),
      quantity: item.quantity,
      unitPrice: unitPrice(item.product, item.optionIds),
    },
  ];
}

/** Items and money: "عرض السلة · <count> · <total>". */
export function cartSummary(lines: CartLine[]): { count: number; total: number } {
  return lines.reduce((s, l) => ({ count: s.count + l.quantity, total: cents(s.total + l.unitPrice * l.quantity) }), { count: 0, total: 0 });
}

/** The badge on a product card: how many of it are in the cart, over every line. */
export const quantityOf = (lines: CartLine[], productId: number) =>
  lines.reduce((n, l) => (l.product.id === productId ? n + l.quantity : n), 0);

/** "تسوّق الآن وأضف <left> أو أكثر إلى طلبك!": what is missing to reach the store's minimum order. */
export const minimumOrderLeft = (total: number, minimumOrder: number) => Math.max(0, cents(minimumOrder - total));
