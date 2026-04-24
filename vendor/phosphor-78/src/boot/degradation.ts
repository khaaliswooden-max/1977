// CC8 + AR19: degradation chain skeleton.
// Real renderer creation lives in stories 4.x; this file defines the
// shape of the high → mid → low → fail walk so consumers can wire in
// against a stable interface from day one.

import { signal } from '@/util/signals';
import { log } from '@/util/log';
import { err, isErr, ok, type Result } from '@/util/result';

export type ShaderTier = 'high' | 'mid' | 'low';

export const TIERS: readonly ShaderTier[] = ['high', 'mid', 'low'] as const;

/** Currently-active tier. Subscribed-to by debug overlay + companion. */
export const activeShaderTier = signal<ShaderTier | null>(null);

export type TierFactory<T> = (tier: ShaderTier) => Promise<Result<T, Error>>;

/**
 * Walk high → mid → low until a tier succeeds. Throws (invariant
 * violation) only if every tier fails - that should be unreachable
 * because Low is meant to work everywhere WebGL2 works. Sets
 * `activeShaderTier` to whichever tier won.
 */
export async function bootRenderer<T>(factory: TierFactory<T>): Promise<T> {
  for (const tier of TIERS) {
    const r = await factory(tier);
    if (!isErr(r)) {
      activeShaderTier.set(tier);
      log.info(`renderer active: ${tier}`);
      return r.value;
    }
    log.warn(`renderer tier ${tier} failed`, r.error);
  }
  log.error('all renderer tiers failed - this should be unreachable');
  throw new Error('invariant: all renderer tiers failed');
}

/**
 * Convenience for tests: wrap a synchronous factory.
 */
export function syncFactory<T>(
  fn: (tier: ShaderTier) => Result<T, Error>,
): TierFactory<T> {
  return async (tier) => {
    try {
      return fn(tier);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  };
}

/**
 * Helper exported mainly for tests - re-exports `ok` so callers don't
 * need to import from @/util/result just to satisfy types.
 */
export { ok };
