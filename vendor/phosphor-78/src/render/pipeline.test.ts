// Tests for the tier-selection logic in the renderer pipeline. The
// full WebGL pipeline only runs in browser mode; here we exercise
// the pure helper.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pickPreferredTier } from '@/render/pipeline';
import type { Capabilities } from '@/boot/capability-probe';

const STORAGE_KEY = 'phosphor-78:save:v1';

class FakeStorage {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}

function setLocalStorage(fake: FakeStorage): void {
  (globalThis as unknown as { localStorage: FakeStorage }).localStorage = fake;
}
function getLocalStorage(): FakeStorage {
  return (globalThis as unknown as { localStorage: FakeStorage }).localStorage;
}
function setWindow(href: string): void {
  (globalThis as unknown as { window: unknown }).window = {
    location: { href },
  };
}
function clearGlobals(): void {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  delete (globalThis as unknown as { window?: unknown }).window;
}

beforeEach(() => {
  setLocalStorage(new FakeStorage());
  setWindow('http://localhost/');
});

afterEach(() => {
  clearGlobals();
});

describe('pickPreferredTier', () => {
  it('explicit override wins over everything', () => {
    expect(pickPreferredTier({ tierOverride: 'high' })).toBe('high');
  });

  it('URL ?tier= beats save and capabilities', () => {
    setWindow('http://localhost/?tier=low');
    getLocalStorage().store.set(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        highScores: [],
        settings: { volume: 1, shaderTier: 'high' },
      }),
    );
    expect(
      pickPreferredTier({
        capabilities: { gpuTier: 'high' } as Capabilities,
      }),
    ).toBe('low');
  });

  it('localStorage save beats capabilities when no URL override', () => {
    getLocalStorage().store.set(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        highScores: [],
        settings: { volume: 1, shaderTier: 'high' },
      }),
    );
    expect(
      pickPreferredTier({
        capabilities: { gpuTier: 'low' } as Capabilities,
      }),
    ).toBe('high');
  });

  it('falls through to capability gpuTier when no URL or save', () => {
    expect(
      pickPreferredTier({
        capabilities: { gpuTier: 'low' } as Capabilities,
      }),
    ).toBe('low');
  });

  it('mid is the safe default when nothing is known', () => {
    expect(pickPreferredTier({})).toBe('mid');
  });

  it('ignores unrecognized URL ?tier values', () => {
    setWindow('http://localhost/?tier=ultra');
    expect(pickPreferredTier({})).toBe('mid');
  });

  it('does not throw when window is undefined', () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    expect(() => pickPreferredTier({})).not.toThrow();
  });
});
