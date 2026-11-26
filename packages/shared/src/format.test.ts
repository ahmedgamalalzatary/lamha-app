import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatClock,
  formatDay,
  formatMinutes,
  formatMinutesRange,
  formatMoney,
  formatPhone,
  isEgyptianMobile,
  normalizePhone,
  toLatinDigits,
} from './format.js';

describe('toLatinDigits (an Arabic keyboard types ٠-٩ or ۰-۹)', () => {
  it.each([
    ['١٢٣٤', '1234'],
    ['۰۹۵۶', '0956'],
    ['12٣4', '1234'],
    ['abc', 'abc'],
  ])('%s → %s', (input, want) => {
    expect(toLatinDigits(input)).toBe(want);
  });
});

describe('formatMoney (contract §7: "285.00 ج.م")', () => {
  it.each([
    [285, 'ar', '285.00 ج.م'],
    [184.5, 'ar', '184.50 ج.م'],
    [0, 'ar', '0.00 ج.م'],
    [1234.567, 'ar', '1234.57 ج.م'],
    [25, 'en', '25.00 EGP'],
  ] as const)('%s in %s is %s', (amount, locale, want) => {
    expect(formatMoney(amount, locale)).toBe(want);
  });

  it('defaults to Arabic', () => {
    expect(formatMoney(95)).toBe('95.00 ج.م');
  });

  it('shows a minus sign for deductions', () => {
    expect(formatMoney(-20)).toBe('-20.00 ج.م');
  });
});

describe('formatAmount (offer text: "اربح 300 ج.م عن كل صديق")', () => {
  it.each([
    [300, 'ar', '300 ج.م'],
    [25, 'en', '25 EGP'],
    [12.5, 'ar', '12.50 ج.م'],
  ] as const)('%s in %s is %s', (amount, locale, want) => {
    expect(formatAmount(amount, locale)).toBe(want);
  });
});

describe('normalizePhone', () => {
  it.each([
    ['01554459196', '01554459196'],
    ['+201554459196', '01554459196'],
    ['201554459196', '01554459196'],
    ['0020 155 445 9196', '01554459196'],
    ['1554459196', '01554459196'],
    ['٠١٥٥٤٤٥٩١٩٦', '01554459196'],
  ])('%s becomes %s', (input, want) => {
    expect(normalizePhone(input)).toBe(want);
  });
});

describe('isEgyptianMobile', () => {
  it.each(['01012345678', '01112345678', '01212345678', '01554459196', '+201554459196'])(
    'accepts %s',
    (phone) => expect(isEgyptianMobile(phone)).toBe(true),
  );

  it.each(['01312345678', '0155445919', '015544591961', '0223456789', '', 'abc'])(
    'rejects %s',
    (phone) => expect(isEgyptianMobile(phone)).toBe(false),
  );
});

describe('formatPhone (shown with +2, contract §7)', () => {
  it('prefixes the local number with +2', () => {
    expect(formatPhone('01554459196')).toBe('+2 01554459196');
  });

  it('normalizes before formatting', () => {
    expect(formatPhone('+201554459196')).toBe('+2 01554459196');
  });
});

describe('formatMinutes', () => {
  it('formats delivery time in Arabic', () => {
    expect(formatMinutes(25)).toBe('25 دقيقة');
  });

  it('formats delivery time in English', () => {
    expect(formatMinutes(25, 'en')).toBe('25 min');
  });

  it('formats a range for pharmacies', () => {
    expect(formatMinutesRange(30, 60)).toBe('30 - 60 دقيقة');
    expect(formatMinutesRange(30, 60, 'en')).toBe('30 - 60 min');
  });
});

describe('formatDay (contract §8.4 "صالح حتى 30 نوفمبر 2026")', () => {
  it('writes the Cairo day with the month name and Latin digits', () => {
    expect(formatDay('2026-11-30T12:00:00.000Z')).toBe('30 نوفمبر 2026');
    expect(formatDay('2026-11-30T12:00:00.000Z', 'en')).toBe('30 November 2026');
  });

  it('counts the day in Cairo: 23:30 UTC is the next day there', () => {
    expect(formatDay('2026-01-31T23:30:00.000Z')).toBe('1 فبراير 2026');
  });
});

describe('formatClock', () => {
  it('reads a Cairo time as "يفتح الساعة 11:00 ص" does in Tawsilty', () => {
    expect(formatClock('11:00')).toBe('11:00 ص');
    expect(formatClock('23:30')).toBe('11:30 م');
    expect(formatClock('00:15')).toBe('12:15 ص');
    expect(formatClock('12:00', 'en')).toBe('12:00 PM');
  });
});
