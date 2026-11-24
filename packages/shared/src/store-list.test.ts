import { describe, expect, it } from 'vitest';
import { applyStoreFilter, inSearchScope, type ListedStore } from './store-list.js';

const store = (id: number, over: Partial<ListedStore> = {}): ListedStore => ({
  id,
  rating: null,
  ratingCount: 0,
  deliveryMinutes: 45,
  pickupAllowed: false,
  ...over,
});

const ids = (list: ListedStore[]) => list.map((s) => s.id);

describe('applyStoreFilter (contract §8.3: sort sheet, rating sheet, chips)', () => {
  const stores = [
    store(1, { rating: 4.2, ratingCount: 10 }),
    store(2, { rating: null }),
    store(3, { rating: 4.8, ratingCount: 3, deliveryMinutes: 20, pickupAllowed: true }),
    store(4, { rating: 3.4, ratingCount: 50, deliveryMinutes: 30 }),
  ];

  it('keeps the admin order by default (الافتراضي)', () => {
    expect(ids(applyStoreFilter(stores, {}))).toEqual([1, 2, 3, 4]);
    expect(ids(applyStoreFilter(stores, { sort: 'default' }))).toEqual([1, 2, 3, 4]);
  });

  it('puts the best rated first, new stores ("جديد") last (الأعلى تقييماً)', () => {
    expect(ids(applyStoreFilter(stores, { sort: 'rating' }))).toEqual([3, 1, 4, 2]);
  });

  it('breaks a rating tie by the number of ratings', () => {
    const tie = [store(1, { rating: 4, ratingCount: 2 }), store(2, { rating: 4, ratingCount: 9 })];
    expect(ids(applyStoreFilter(tie, { sort: 'rating' }))).toEqual([2, 1]);
  });

  it('puts the newest store first (الأحدث)', () => {
    expect(ids(applyStoreFilter(stores, { sort: 'newest' }))).toEqual([4, 3, 2, 1]);
  });

  it('keeps the admin order for الأقرب إليك until stores have a location (Phase 8)', () => {
    expect(ids(applyStoreFilter(stores, { sort: 'nearest' }))).toEqual([1, 2, 3, 4]);
  });

  it('keeps stores rated at or above the floor; a new store has no rating yet (3.0+ … 4.5+)', () => {
    expect(ids(applyStoreFilter(stores, { minRating: 4 }))).toEqual([1, 3]);
    expect(ids(applyStoreFilter(stores, { minRating: 3 }))).toEqual([1, 3, 4]);
  });

  it('keeps fast stores (توصيل سريع) and stores with pickup (الاستلام)', () => {
    expect(ids(applyStoreFilter(stores, { fast: true }))).toEqual([3, 4]);
    expect(ids(applyStoreFilter(stores, { pickup: true }))).toEqual([3]);
  });

  it('combines filters and sort', () => {
    expect(ids(applyStoreFilter(stores, { fast: true, sort: 'rating' }))).toEqual([3, 4]);
  });

  it('splits search tabs: مطاعم are restaurants, متاجر أخرى everything else', () => {
    expect(inSearchScope('restaurant', 'restaurants')).toBe(true);
    expect(inSearchScope('market', 'restaurants')).toBe(false);
    expect(inSearchScope('pharmacy', 'others')).toBe(true);
    expect(inSearchScope('restaurant', 'others')).toBe(false);
    expect(inSearchScope('restaurant', 'all')).toBe(true);
  });

  it('does not change the list it was given', () => {
    const copy = [...stores];
    applyStoreFilter(stores, { sort: 'newest' });
    expect(stores).toEqual(copy);
  });
});
