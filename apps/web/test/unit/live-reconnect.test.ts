import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renewAndReconnect } from '@/core/api/live-reconnect';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** Lets the promise callbacks the timers started run. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('renewAndReconnect (a socket the server dropped)', () => {
  it('renews the token through one call, then connects again', async () => {
    const connect = vi.fn();
    const probe = vi.fn(async () => undefined);
    renewAndReconnect(connect, probe);
    expect(probe).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5_000);
    await settle();
    expect(probe).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('keeps trying, waiting longer each time up to a minute, while the call fails', async () => {
    const connect = vi.fn();
    const probe = vi.fn().mockRejectedValueOnce(new Error('offline')).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    renewAndReconnect(connect, probe);
    vi.advanceTimersByTime(5_000);
    await settle();
    expect(probe).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(9_999);
    await settle();
    expect(probe).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    await settle();
    expect(probe).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(20_000);
    await settle();
    expect(probe).toHaveBeenCalledTimes(3);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('stops when cancelled (the screen left, or the account signed out)', async () => {
    const connect = vi.fn();
    const probe = vi.fn().mockRejectedValue(new Error('offline'));
    const cancel = renewAndReconnect(connect, probe);
    vi.advanceTimersByTime(5_000);
    await settle();
    cancel();
    vi.advanceTimersByTime(120_000);
    await settle();
    expect(probe).toHaveBeenCalledTimes(1);
    expect(connect).not.toHaveBeenCalled();
  });
});
