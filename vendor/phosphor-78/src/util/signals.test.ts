import { describe, expect, it, vi } from 'vitest';
import { signal } from '@/util/signals';

describe('signal', () => {
  it('starts with the initial value', () => {
    const s = signal(7);
    expect(s.value).toBe(7);
  });

  it('updates value on set()', () => {
    const s = signal('a');
    s.set('b');
    expect(s.value).toBe('b');
  });

  it('invokes subscribers immediately on subscribe with current value', () => {
    const s = signal(42);
    const fn = vi.fn();
    s.subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(42);
  });

  it('notifies all subscribers on change', () => {
    const s = signal(0);
    const a = vi.fn();
    const b = vi.fn();
    s.subscribe(a); // initial 0
    s.subscribe(b); // initial 0
    s.set(1);
    expect(a).toHaveBeenLastCalledWith(1);
    expect(b).toHaveBeenLastCalledWith(1);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('does NOT notify when value is identical (Object.is)', () => {
    const s = signal(5);
    const fn = vi.fn();
    s.subscribe(fn); // initial call
    s.set(5);
    s.set(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('treats NaN === NaN under Object.is (no notification)', () => {
    const s = signal(Number.NaN);
    const fn = vi.fn();
    s.subscribe(fn); // initial NaN
    s.set(Number.NaN);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops further notifications', () => {
    const s = signal('x');
    const fn = vi.fn();
    const off = s.subscribe(fn); // initial
    s.set('y'); // notified
    off();
    s.set('z'); // not notified
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('y');
  });

  it('subscriber unsubscribing mid-notification does not skip peers', () => {
    const s = signal(0);
    const log: string[] = [];
    let inSetPhase = false;
    const offA = s.subscribe(() => log.push('a'));
    s.subscribe(() => {
      log.push('b');
      // Only remove `a` when fired by an actual set(), not by the
      // immediate-on-subscribe call.
      if (inSetPhase) offA();
    });
    s.subscribe(() => log.push('c'));
    log.length = 0;
    inSetPhase = true;
    s.set(1);
    // The snapshot taken at set() time was [a, b, c]; b removes `a`
    // mid-iteration but iteration is over a copy so all three still fire.
    expect(log).toEqual(['a', 'b', 'c']);
    // The next set() should skip `a` (already removed).
    log.length = 0;
    s.set(2);
    expect(log).toEqual(['b', 'c']);
  });
});
