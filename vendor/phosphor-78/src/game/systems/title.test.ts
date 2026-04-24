import { describe, expect, it } from 'vitest';
import { tickTitle } from '@/game/systems/title';
import { initialState } from '@/game/state';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };
const confirm = { ...NEUTRAL_INPUT, confirm: true };

describe('tickTitle', () => {
  it('confirm on title transitions to playing wave 1 with fresh state', () => {
    const r = tickTitle(initialState(), confirm, clock, []);
    expect(r.mode.kind).toBe('playing');
    if (r.mode.kind === 'playing') expect(r.mode.wave).toBe(1);
    expect(r.invaders.length).toBe(55);
    expect(r.shields.length).toBe(4);
    expect(r.score).toBe(0);
    expect(r.lives).toBe(3);
  });

  it('does nothing on title without confirm', () => {
    const s = initialState();
    expect(tickTitle(s, NEUTRAL_INPUT, clock, [])).toBe(s);
  });

  it('confirm on gameover restarts directly into a fresh playing wave 1', () => {
    // Story 5.10 fix: gameover + Enter used to bounce through
    // title (which left the player.alive=false from death animation
    // unchanged, freezing the next wave). Now it goes straight to
    // playing with a fully-reset player.
    const s = {
      ...initialState(),
      mode: { kind: 'gameover' as const, finalScore: 1234 },
      lives: 0,
      player: {
        pos: { x: 0, y: 0 },
        alive: false,
        deathAnimationFrames: 0,
        shotsFired: 99,
      },
    };
    const r = tickTitle(s, confirm, clock, []);
    expect(r.mode.kind).toBe('playing');
    expect(r.player.alive).toBe(true);
    expect(r.player.deathAnimationFrames).toBe(0);
    expect(r.player.shotsFired).toBe(0);
    expect(r.lives).toBe(3);
    expect(r.invaders.length).toBe(55);
  });

  it('does nothing during playing mode', () => {
    const s = {
      ...initialState(),
      mode: { kind: 'playing' as const, wave: 2 },
    };
    expect(tickTitle(s, confirm, clock, [])).toBe(s);
  });
});
