import { describe, expect, it } from 'vitest';
import {
  adsrAttackMs,
  adsrDecayMs,
  adsrReleaseMs,
  adsrSustain,
  filterCutoffHz,
  marchPitchScale,
} from '@/audio/tunables';

describe('audio tunables', () => {
  it('exposes 4 ADSR signals + filter + pitch scale', () => {
    expect(adsrAttackMs.value).toBeGreaterThanOrEqual(0);
    expect(adsrDecayMs.value).toBeGreaterThanOrEqual(0);
    expect(adsrSustain.value).toBeGreaterThanOrEqual(0);
    expect(adsrSustain.value).toBeLessThanOrEqual(1);
    expect(adsrReleaseMs.value).toBeGreaterThanOrEqual(0);
    expect(filterCutoffHz.value).toBeGreaterThan(20);
    expect(marchPitchScale.value).toBeGreaterThan(0);
  });

  it('signals support .set() and .subscribe()', () => {
    const calls: number[] = [];
    const off = filterCutoffHz.subscribe((v) => calls.push(v));
    const before = filterCutoffHz.value;
    filterCutoffHz.set(2000);
    expect(filterCutoffHz.value).toBe(2000);
    filterCutoffHz.set(before); // restore
    off();
    // Initial subscribe + 2 .set() calls = 3 callbacks.
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });
});
