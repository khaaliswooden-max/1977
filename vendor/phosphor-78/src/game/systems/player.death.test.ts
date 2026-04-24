// Story 5.9: tests for tickPlayer's death-animation countdown +
// respawn / game-over handoff. Separate from player.test.ts so
// the original "movement + firing" tests stay focused.

import { describe, expect, it } from 'vitest';
import { PLAYER_Y, tickPlayer } from '@/game/systems/player';
import { initialState } from '@/game/state';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

function dyingPlayer(deathFrames: number, lives: number): GameState {
  const base = initialState();
  return {
    ...base,
    mode: { kind: 'playing', wave: 1 },
    lives,
    player: {
      ...base.player,
      alive: false,
      deathAnimationFrames: deathFrames,
    },
  };
}

describe('tickPlayer death-animation handoff', () => {
  it('decrements deathAnimationFrames each tick while > 1', () => {
    const s = dyingPlayer(60, 3);
    const r = tickPlayer(s, NEUTRAL_INPUT, clock, []);
    expect(r.player.deathAnimationFrames).toBe(59);
    expect(r.player.alive).toBe(false);
    expect(r.lives).toBe(3);
  });

  it('on the tick deathAnimationFrames hits 0 with lives > 0: respawns', () => {
    const s = dyingPlayer(1, 3);
    const r = tickPlayer(s, NEUTRAL_INPUT, clock, []);
    expect(r.player.deathAnimationFrames).toBe(0);
    expect(r.player.alive).toBe(true);
    expect(r.player.pos.y).toBe(PLAYER_Y);
    expect(r.lives).toBe(2); // lost a life
  });

  it('on the tick deathAnimationFrames hits 0 with lives == 1: stays dead at lives 0', () => {
    const s = dyingPlayer(1, 1);
    const r = tickPlayer(s, NEUTRAL_INPUT, clock, []);
    expect(r.player.alive).toBe(false);
    expect(r.player.deathAnimationFrames).toBe(0);
    expect(r.lives).toBe(0);
  });

  it('once dead and timer is 0, stays dead (no further changes)', () => {
    const s = dyingPlayer(0, 0);
    const r = tickPlayer(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('input is ignored while dead', () => {
    const s = dyingPlayer(30, 3);
    const r = tickPlayer(
      s,
      { ...NEUTRAL_INPUT, left: true, fire: true },
      clock,
      [],
    );
    // No movement, no bullet spawned.
    expect(r.player.pos.x).toBe(s.player.pos.x);
    expect(r.playerBullet).toBeNull();
  });
});
