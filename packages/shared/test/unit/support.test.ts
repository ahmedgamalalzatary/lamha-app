import { describe, expect, it } from 'vitest';
import { BAD_TAGS, GOOD_TAGS, isBadRating, ratingProblem, ratingTagLabel, ratingTags, ratingWord, ticketProblem } from '../../src/support.js';

describe('ratings (contract §8.8)', () => {
  it('1 to 3 stars is a bad rating, 4 and 5 a good one [Owner]', () => {
    expect([1, 2, 3, 4, 5].map(isBadRating)).toEqual([true, true, true, false, false]);
  });

  it('shows the problem chips for a bad rating and the good chips otherwise', () => {
    expect(ratingTags(1)).toBe(BAD_TAGS);
    expect(ratingTags(3)).toBe(BAD_TAGS);
    expect(ratingTags(4)).toBe(GOOD_TAGS);
    expect(BAD_TAGS.map((t) => ratingTagLabel(t))).toEqual([
      'عنصر مفقود',
      'طلب خاطئ',
      'الطعام غير ساخن',
      'المذاق غير جيد',
      'الكمية غير كافية',
      'التغليف غير مناسب',
    ]);
    expect(ratingTagLabel('missing_item', 'en')).toBe('Missing item');
  });

  it('names each star count, 1 star as Tawsilty does', () => {
    expect(ratingWord(1)).toBe('مخيبة للآمال');
    expect(new Set([1, 2, 3, 4, 5].map((n) => ratingWord(n))).size).toBe(5);
  });

  it('a bad rating needs at least one reason; a good one may have none', () => {
    expect(ratingProblem({ stars: 2, tags: [], text: '' })).toBe('reason');
    expect(ratingProblem({ stars: 2, tags: ['wrong_order'], text: '' })).toBeNull();
    expect(ratingProblem({ stars: 5, tags: [], text: '' })).toBeNull();
  });

  it('refuses stars out of range, chips of the other kind, repeats and long text', () => {
    expect(ratingProblem({ stars: 0, tags: [], text: '' })).toBe('stars');
    expect(ratingProblem({ stars: 2.5, tags: ['wrong_order'], text: '' })).toBe('stars');
    expect(ratingProblem({ stars: 5, tags: ['wrong_order'], text: '' })).toBe('tags');
    expect(ratingProblem({ stars: 1, tags: ['wrong_order', 'wrong_order'], text: '' })).toBe('tags');
    expect(ratingProblem({ stars: 5, tags: [], text: 'x'.repeat(501) })).toBe('text');
  });
});

describe('tickets (contract §8.14)', () => {
  it('needs some words, not too many', () => {
    expect(ticketProblem('   ')).toBe('empty');
    expect(ticketProblem('x'.repeat(1001))).toBe('long');
    expect(ticketProblem('الأكل وصل بارد')).toBeNull();
  });
});
