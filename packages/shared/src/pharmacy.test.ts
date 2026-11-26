import { describe, expect, it } from 'vitest';
import { parseRequestPrice, REQUEST_IMAGE_PATTERN, requestComplete } from './pharmacy.js';

describe('pharmacy requests (contract §8.11)', () => {
  it('needs a photo or some text', () => {
    expect(requestComplete({ image: null, text: '' })).toBe(false);
    expect(requestComplete({ image: null, text: '   ' })).toBe(false);
    expect(requestComplete({ image: null, text: 'علبة بنادول' })).toBe(true);
    expect(requestComplete({ image: '/uploads/requests/a1.jpg', text: '' })).toBe(true);
  });

  it('takes only photos the API stored for requests', () => {
    expect(REQUEST_IMAGE_PATTERN.test('/uploads/requests/0f3c-9a.jpg')).toBe(true);
    expect(REQUEST_IMAGE_PATTERN.test('/uploads/catalog/0f3c.jpg')).toBe(false);
    expect(REQUEST_IMAGE_PATTERN.test('https://evil.example/x.jpg')).toBe(false);
    expect(REQUEST_IMAGE_PATTERN.test('/uploads/requests/../avatars/x.jpg')).toBe(false);
  });

  it('reads the price a pharmacy types, in either digits', () => {
    expect(parseRequestPrice('120')).toBe(120);
    expect(parseRequestPrice(' 55.5 ')).toBe(55.5);
    expect(parseRequestPrice('١٢٠٫٧٥')).toBe(120.75);
    expect(parseRequestPrice('12,5')).toBe(12.5);
    expect(parseRequestPrice('')).toBeNull();
    expect(parseRequestPrice('0')).toBeNull();
    expect(parseRequestPrice('1.234')).toBeNull();
    expect(parseRequestPrice('-5')).toBeNull();
    expect(parseRequestPrice('abc')).toBeNull();
    expect(parseRequestPrice('100001')).toBeNull();
  });
});
