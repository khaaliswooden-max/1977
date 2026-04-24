import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAVE,
  HIGH_SCORE_LIMIT,
  STORAGE_KEY,
  insertHighScore,
  load,
  qualifiesForHighScore,
  save,
} from '@/persistence/save';
import { isErr, isOk } from '@/util/result';

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
}

class ThrowingStorage {
  setItem(): void {
    throw new Error('quota exceeded');
  }
  getItem(): string | null {
    throw new Error('storage disabled');
  }
  removeItem(): void {}
}

describe('load', () => {
  it('returns DEFAULT_SAVE when storage is null', () => {
    expect(load(null)).toEqual(DEFAULT_SAVE);
  });

  it('returns DEFAULT_SAVE when key is missing', () => {
    expect(load(new FakeStorage())).toEqual(DEFAULT_SAVE);
  });

  it('returns DEFAULT_SAVE on JSON parse error', () => {
    const s = new FakeStorage();
    s.store.set(STORAGE_KEY, 'not-json');
    expect(load(s)).toEqual(DEFAULT_SAVE);
  });

  it('returns DEFAULT_SAVE when schemaVersion mismatches', () => {
    const s = new FakeStorage();
    s.store.set(STORAGE_KEY, JSON.stringify({ schemaVersion: 99 }));
    expect(load(s)).toEqual(DEFAULT_SAVE);
  });

  it('clamps invalid volume / shaderTier to defaults', () => {
    const s = new FakeStorage();
    s.store.set(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        highScores: [],
        settings: { volume: 99, shaderTier: 'ultra' },
      }),
    );
    const r = load(s);
    expect(r.settings.volume).toBe(1);
    expect(r.settings.shaderTier).toBe('mid');
  });

  it('round-trips a save', () => {
    const storage = new FakeStorage();
    const written = {
      schemaVersion: 1 as const,
      highScores: [{ initials: 'AAA', score: 1234, date: '2026-04-18' }],
      settings: { volume: 0.5, shaderTier: 'high' as const },
    };
    save(written, storage);
    const read = load(storage);
    expect(read).toEqual(written);
  });
});

describe('save', () => {
  it('returns err when storage is null', () => {
    const r = save(DEFAULT_SAVE, null);
    expect(isErr(r)).toBe(true);
  });

  it('returns err when storage throws (quota)', () => {
    const r = save(DEFAULT_SAVE, new ThrowingStorage());
    expect(isErr(r)).toBe(true);
  });

  it('returns ok on success', () => {
    expect(isOk(save(DEFAULT_SAVE, new FakeStorage()))).toBe(true);
  });
});

describe('insertHighScore + qualifiesForHighScore', () => {
  it('insertion sorts descending and caps at HIGH_SCORE_LIMIT', () => {
    let list: readonly { initials: string; score: number; date: string }[] = [];
    for (let i = 0; i < 15; i++) {
      list = insertHighScore(list, {
        initials: 'XX',
        score: i * 100,
        date: '2026-04-18',
      });
    }
    expect(list).toHaveLength(HIGH_SCORE_LIMIT);
    expect(list[0]?.score).toBe(1400);
    expect(list[HIGH_SCORE_LIMIT - 1]?.score).toBe(500);
  });

  it('qualifiesForHighScore: empty board accepts anything', () => {
    expect(qualifiesForHighScore([], 1)).toBe(true);
  });

  it('qualifiesForHighScore: full board only accepts > lowest', () => {
    const full = Array.from({ length: HIGH_SCORE_LIMIT }, (_, i) => ({
      initials: 'X',
      score: 1000 - i,
      date: '',
    }));
    expect(qualifiesForHighScore(full, 991)).toBe(false);
    expect(qualifiesForHighScore(full, 992)).toBe(true);
  });
});
