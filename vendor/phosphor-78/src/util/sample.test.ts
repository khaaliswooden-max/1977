import { describe, expect, it } from 'vitest';

describe('vitest sanity', () => {
  it('arithmetic still works', () => {
    expect(1 + 1).toBe(2);
  });

  it('runs in both node and browser mode', () => {
    // Detects environment without failing in either; useful smoke for AC2.
    const inBrowser = typeof globalThis.window !== 'undefined';
    expect(typeof inBrowser).toBe('boolean');
  });
});
