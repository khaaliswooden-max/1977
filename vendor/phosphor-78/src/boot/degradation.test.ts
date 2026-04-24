import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeShaderTier,
  bootRenderer,
  syncFactory,
} from '@/boot/degradation';
import { err, ok } from '@/util/result';

describe('bootRenderer degradation chain', () => {
  afterEach(() => {
    activeShaderTier.set(null);
    vi.restoreAllMocks();
  });

  it('returns first success and records active tier', async () => {
    const factory = syncFactory((tier) => ok(`renderer-${tier}`));
    const value = await bootRenderer(factory);
    expect(value).toBe('renderer-high');
    expect(activeShaderTier.value).toBe('high');
  });

  it('falls through to next tier when one fails', async () => {
    const factory = syncFactory((tier) => {
      if (tier === 'high') return err(new Error('no float'));
      return ok(`renderer-${tier}`);
    });
    const value = await bootRenderer(factory);
    expect(value).toBe('renderer-mid');
    expect(activeShaderTier.value).toBe('mid');
  });

  it('walks all the way to low', async () => {
    const factory = syncFactory((tier) => {
      if (tier !== 'low') return err(new Error('skip'));
      return ok('low-renderer');
    });
    const value = await bootRenderer(factory);
    expect(value).toBe('low-renderer');
    expect(activeShaderTier.value).toBe('low');
  });

  it('throws invariant when every tier fails', async () => {
    const factory = syncFactory(() => err(new Error('busted')));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(bootRenderer(factory)).rejects.toThrow(/invariant/);
    expect(activeShaderTier.value).toBeNull();
  });

  it('catches synchronous throws inside the factory', async () => {
    const factory = syncFactory((tier) => {
      if (tier === 'high') throw new Error('oops');
      return ok(`renderer-${tier}`);
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const value = await bootRenderer(factory);
    expect(value).toBe('renderer-mid');
    expect(activeShaderTier.value).toBe('mid');
  });
});
