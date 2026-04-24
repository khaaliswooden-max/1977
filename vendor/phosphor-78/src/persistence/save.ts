// ADR-008: localStorage save schema v1.
//
// Single key, versioned shape, soft fallback to defaults on missing
// or unparseable data. Per CC1 the read path returns the default
// shape rather than throwing; persistence is a system-boundary that
// must never crash the app.

import { log } from '@/util/log';
import type { Result } from '@/util/result';
import { err, ok } from '@/util/result';
import type { HighScore } from '@/types/game';

export const STORAGE_KEY = 'phosphor-78:save:v1';
export const HIGH_SCORE_LIMIT = 10;

export type ShaderTier = 'low' | 'mid' | 'high';

export interface Settings {
  readonly volume: number; // 0..1
  readonly shaderTier: ShaderTier;
}

export interface SaveV1 {
  readonly schemaVersion: 1;
  readonly highScores: readonly HighScore[];
  readonly settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 1,
  shaderTier: 'mid',
};

export const DEFAULT_SAVE: SaveV1 = {
  schemaVersion: 1,
  highScores: [],
  settings: DEFAULT_SETTINGS,
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function load(storage: StorageLike | null = defaultStorage()): SaveV1 {
  if (!storage) return DEFAULT_SAVE;
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (e) {
    log.warn('save: read failed, using defaults', e);
    return DEFAULT_SAVE;
  }
  if (!raw) return DEFAULT_SAVE;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveV1>;
    return migrate(parsed);
  } catch (e) {
    log.warn('save: parse failed, using defaults', e);
    return DEFAULT_SAVE;
  }
}

export function save(
  s: SaveV1,
  storage: StorageLike | null = defaultStorage(),
): Result<void, Error> {
  if (!storage) return err(new Error('localStorage unavailable'));
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(s));
    return ok(undefined);
  } catch (e) {
    log.warn('save: write failed', e);
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export function clear(
  storage: StorageLike | null = defaultStorage(),
): void {
  storage?.removeItem(STORAGE_KEY);
}

function migrate(parsed: Partial<SaveV1>): SaveV1 {
  if (parsed.schemaVersion !== 1) return DEFAULT_SAVE;
  return {
    schemaVersion: 1,
    highScores: Array.isArray(parsed.highScores)
      ? parsed.highScores.slice(0, HIGH_SCORE_LIMIT)
      : [],
    settings: {
      volume: clampVolume(parsed.settings?.volume),
      shaderTier: validTier(parsed.settings?.shaderTier),
    },
  };
}

function clampVolume(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return DEFAULT_SETTINGS.volume;
  return Math.max(0, Math.min(1, v));
}

function validTier(t: unknown): ShaderTier {
  return t === 'low' || t === 'mid' || t === 'high' ? t : DEFAULT_SETTINGS.shaderTier;
}

/**
 * Insert a candidate score and return the new top-10 list. Stable
 * sort: equal scores keep insertion order (so the older entry stays
 * higher). The result is always at most HIGH_SCORE_LIMIT long.
 */
export function insertHighScore(
  current: readonly HighScore[],
  candidate: HighScore,
): readonly HighScore[] {
  const merged = [...current, candidate];
  // Sort descending by score; stable in modern JS engines.
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, HIGH_SCORE_LIMIT);
}

/** True if a score would make the high-score table. */
export function qualifiesForHighScore(
  current: readonly HighScore[],
  score: number,
): boolean {
  if (current.length < HIGH_SCORE_LIMIT) return true;
  const last = current[current.length - 1];
  return last !== undefined && score > last.score;
}
