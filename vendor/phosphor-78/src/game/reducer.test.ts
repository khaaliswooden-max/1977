import { describe, expect, it } from 'vitest';
import { tick } from '@/game/reducer';
import { initialState } from '@/game/state';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = {
  currentTime: 0,
  currentStep: () => 0,
};

describe('tick (top-level reducer)', () => {
  it('returns { next, events } shape', () => {
    const r = tick(initialState(), NEUTRAL_INPUT, clock);
    expect(r).toHaveProperty('next');
    expect(r).toHaveProperty('events');
    expect(Array.isArray(r.events)).toBe(true);
  });

  it('advances frame counter by 1 each tick', () => {
    const s0 = initialState();
    const { next: s1 } = tick(s0, NEUTRAL_INPUT, clock);
    const { next: s2 } = tick(s1, NEUTRAL_INPUT, clock);
    expect(s1.frame).toBe(1);
    expect(s2.frame).toBe(2);
  });

  it('produces no events with placeholder sub-reducers', () => {
    const r = tick(initialState(), NEUTRAL_INPUT, clock);
    expect(r.events).toEqual([]);
  });

  it('does not mutate the input state object', () => {
    const s0 = initialState();
    const before = JSON.stringify(s0);
    tick(s0, NEUTRAL_INPUT, clock);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it('is deterministic - same input yields same output', () => {
    const s0 = initialState();
    const a = tick(s0, NEUTRAL_INPUT, clock);
    const b = tick(s0, NEUTRAL_INPUT, clock);
    expect(a.next).toEqual(b.next);
    expect(a.events).toEqual(b.events);
  });

  // Story 5.12: end-to-end gameover→Enter restart through the full
  // reducer chain (not just tickTitle in isolation). This catches
  // the case where some sub-reducer downstream of tickTitle would
  // immediately re-enter gameover on the same tick.
  it('Enter on gameover restarts through full reducer chain', () => {
    const confirm = { ...NEUTRAL_INPUT, confirm: true };
    const start = {
      ...initialState(),
      mode: { kind: 'gameover' as const, finalScore: 1234 },
      lives: 0,
      player: {
        pos: { x: 100, y: 216 },
        alive: false,
        deathAnimationFrames: 0,
        shotsFired: 99,
      },
    };
    const { next } = tick(start, confirm, clock);
    expect(next.mode.kind).toBe('playing');
    expect(next.player.alive).toBe(true);
    expect(next.lives).toBe(3);
    expect(next.invaders.length).toBe(55);
    expect(next.shields.length).toBe(4);

    // Continue 30 more ticks holding nothing — game should stay
    // in playing mode (regression check that nothing flips it
    // back to gameover on the next frame).
    let s = next;
    for (let i = 0; i < 30; i++) {
      const r = tick(s, NEUTRAL_INPUT, clock);
      s = r.next;
    }
    expect(s.mode.kind).toBe('playing');
    expect(s.player.alive).toBe(true);
  });
});
