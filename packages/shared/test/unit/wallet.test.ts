import { describe, expect, it } from 'vitest';
import { adjustProblem, cashDue, WALLET_ADJUST_MAX, WALLET_NOTE_LIMIT, walletPays } from '../../src/wallet.js';

describe('paying with the wallet (contract §8.15)', () => {
  it('pays as much as it holds, up to the total; cash pays the rest [Owner, 2026-11-26]', () => {
    expect(walletPays(50, 120)).toBe(50);
    expect(walletPays(500, 120)).toBe(120);
    expect(walletPays(0, 120)).toBe(0);
    expect(walletPays(120, 120)).toBe(120);
  });

  it('keeps whole piastres', () => {
    expect(walletPays(10.1 + 20.2, 100)).toBe(30.3);
    expect(walletPays(100, 45.555)).toBe(45.56);
  });

  it('never pays below zero', () => {
    expect(walletPays(-5, 100)).toBe(0);
  });

  it('leaves the delivery man the cash part to collect', () => {
    expect(cashDue({ total: 120, walletPaid: 50 })).toBe(70);
    expect(cashDue({ total: 120, walletPaid: 120 })).toBe(0);
    expect(cashDue({ total: 70.3, walletPaid: 0.1 })).toBe(70.2);
  });
});

describe('the admin adding or deducting (contract §11 A5)', () => {
  const ok = { kind: 'add' as const, amount: 25, note: 'تعويض عن تأخير' };

  it('takes an amount above 0 and up to the cap, in piastres', () => {
    expect(adjustProblem(ok, 0)).toBeNull();
    expect(adjustProblem({ ...ok, amount: 0 }, 0)).toBe('amount');
    expect(adjustProblem({ ...ok, amount: -3 }, 0)).toBe('amount');
    expect(adjustProblem({ ...ok, amount: WALLET_ADJUST_MAX }, 0)).toBeNull();
    expect(adjustProblem({ ...ok, amount: WALLET_ADJUST_MAX + 1 }, 0)).toBe('amount');
    expect(adjustProblem({ ...ok, amount: 2.5 }, 0)).toBeNull();
    expect(adjustProblem({ ...ok, amount: 2.555 }, 0)).toBe('amount');
    expect(adjustProblem({ ...ok, amount: Number.NaN }, 0)).toBe('amount');
  });

  it('needs a reason', () => {
    expect(adjustProblem({ ...ok, note: '   ' }, 0)).toBe('note');
    expect(adjustProblem({ ...ok, note: 'x'.repeat(WALLET_NOTE_LIMIT + 1) }, 0)).toBe('note');
  });

  it('never deducts more than the balance [Owner, 2026-11-26]', () => {
    expect(adjustProblem({ ...ok, kind: 'deduct', amount: 30 }, 30)).toBeNull();
    expect(adjustProblem({ ...ok, kind: 'deduct', amount: 30.01 }, 30)).toBe('balance');
    expect(adjustProblem({ ...ok, kind: 'add', amount: 30.01 }, 30)).toBeNull();
  });
});
