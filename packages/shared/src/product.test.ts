import { describe, expect, it } from 'vitest';
import {
  addToCart,
  cartSummary,
  choicesComplete,
  isCustomizable,
  minimumOrderLeft,
  orderedTogether,
  priceByChoice,
  quantityOf,
  type SheetProduct,
  toggleChoice,
  unitPrice,
} from './product.js';

// بونبوني توفيكس (item-sheet-required-option-group.png): the price comes from the weight.
const toffee: SheetProduct = {
  id: 1,
  price: 0,
  optionGroups: [
    {
      id: 10,
      title: 'الوزن',
      required: true,
      maxChoices: 1,
      options: [
        { id: 100, name: 'ربع كيلو', priceDelta: 58.75 },
        { id: 101, name: 'نصف كيلو', priceDelta: 116 },
      ],
    },
  ],
  ingredients: [],
};

// A pizza with an optional "pick up to 2" extras group.
const pizza: SheetProduct = {
  id: 2,
  price: 110,
  optionGroups: [
    {
      id: 20,
      title: 'إضافات',
      required: false,
      maxChoices: 2,
      options: [
        { id: 200, name: 'جبنة', priceDelta: 15 },
        { id: 201, name: 'زيتون', priceDelta: 10 },
        { id: 202, name: 'سجق', priceDelta: 25 },
      ],
    },
  ],
  ingredients: [],
};

// كومبو الفرايد (item-sheet-base-ingredients.png): no groups, removable ingredients.
const combo: SheetProduct = {
  id: 3,
  price: 350,
  optionGroups: [],
  ingredients: [
    { id: 30, name: '٥ اسبايسي ليمون' },
    { id: 31, name: '٥ كراب اتشيز' },
  ],
};

const plain: SheetProduct = { id: 4, price: 160, optionGroups: [], ingredients: [] };

describe('product sheet rules (contract §8.5)', () => {
  it('a product with option groups or ingredients is customizable ("قابل للتخصيص", "‹")', () => {
    expect(isCustomizable(toffee)).toBe(true);
    expect(isCustomizable(combo)).toBe(true);
    expect(isCustomizable(plain)).toBe(false);
  });

  it('shows "السعر حسب الاختيار" only when a required choice sets the whole price', () => {
    expect(priceByChoice(toffee)).toBe(true);
    expect(priceByChoice(pizza)).toBe(false);
    expect(priceByChoice({ ...toffee, price: 20 })).toBe(false);
  });

  it('a "اختر 1" group swaps its choice; other groups keep theirs', () => {
    let chosen = toggleChoice(toffee, [], 10, 100);
    expect(chosen).toEqual([100]);
    chosen = toggleChoice(toffee, chosen, 10, 101);
    expect(chosen).toEqual([101]);
    // Tapping the chosen row of a required group keeps it chosen.
    expect(toggleChoice(toffee, chosen, 10, 101)).toEqual([101]);
  });

  it('an optional group toggles, up to its limit', () => {
    let chosen = toggleChoice(pizza, [], 20, 200);
    chosen = toggleChoice(pizza, chosen, 20, 201);
    expect(chosen).toEqual([200, 201]);
    expect(toggleChoice(pizza, chosen, 20, 202)).toEqual([200, 201]);
    expect(toggleChoice(pizza, chosen, 20, 200)).toEqual([201]);
  });

  it('is complete only when every required group has a choice ("أكمل الاختيارات للإضافة للسلة")', () => {
    expect(choicesComplete(toffee, [])).toBe(false);
    expect(choicesComplete(toffee, [100])).toBe(true);
    expect(choicesComplete(pizza, [])).toBe(true);
  });

  it('prices one item as the base price plus each choice', () => {
    expect(unitPrice(toffee, [100])).toBe(58.75);
    expect(unitPrice(pizza, [200, 201])).toBe(135);
    expect(unitPrice(plain, [])).toBe(160);
  });

  it('suggests the products after this one in the menu, wrapping round ("تُطلب معًا")', () => {
    const menu = [1, 2, 3, 4, 5].map((id) => ({ id }));
    expect(orderedTogether(menu, 3).map((p) => p.id)).toEqual([4, 5, 1, 2]);
    expect(orderedTogether(menu, 1, 2).map((p) => p.id)).toEqual([2, 3]);
    expect(orderedTogether([{ id: 1 }], 1)).toEqual([]);
  });
});

describe('cart on the store page (contract §8.4 bottom bar)', () => {
  it('merges the same product with the same choices into one line', () => {
    let lines = addToCart([], { product: pizza, optionIds: [201, 200], removedIngredientIds: [], quantity: 1 });
    lines = addToCart(lines, { product: pizza, optionIds: [200, 201], removedIngredientIds: [], quantity: 2 });
    lines = addToCart(lines, { product: pizza, optionIds: [200], removedIngredientIds: [], quantity: 1 });
    expect(lines.map((l) => l.quantity)).toEqual([3, 1]);
  });

  it('keeps a line without an ingredient apart from the full one', () => {
    let lines = addToCart([], { product: combo, optionIds: [], removedIngredientIds: [], quantity: 1 });
    lines = addToCart(lines, { product: combo, optionIds: [], removedIngredientIds: [30], quantity: 1 });
    expect(lines).toHaveLength(2);
    expect(quantityOf(lines, combo.id)).toBe(2);
  });

  it('sums items and money for "عرض السلة · <count> · <total>"', () => {
    let lines = addToCart([], { product: toffee, optionIds: [100], removedIngredientIds: [], quantity: 2 });
    lines = addToCart(lines, { product: plain, optionIds: [], removedIngredientIds: [], quantity: 1 });
    expect(cartSummary(lines)).toEqual({ count: 3, total: 277.5 });
    expect(cartSummary([])).toEqual({ count: 0, total: 0 });
  });

  it('says how much is left to reach the minimum order ("أضف 50.00 ج.م أو أكثر")', () => {
    expect(minimumOrderLeft(0, 50)).toBe(50);
    expect(minimumOrderLeft(35.5, 50)).toBe(14.5);
    expect(minimumOrderLeft(80, 50)).toBe(0);
  });
});
