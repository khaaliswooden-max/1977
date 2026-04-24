import { describe, expect, it } from 'vitest';
import { makeInitialFormation } from '@/game/systems/invaders';
import { GAME_OVER_INVADER_Y, tickWave } from '@/game/systems/wave';
import { initialState } from '@/game/state';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

function playing() {
  return {
    ...initialState(),
    mode: { kind: 'playing' as const, wave: 1 },
    invaders: makeInitialFormation(),
  };
}

describe('tickWave', () => {
  it('no-op on title screen', () => {
    const s = initialState();
    const r = tickWave(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('triggers game_over when an invader reaches GAME_OVER_INVADER_Y', () => {
    const s = playing();
    const lowered = s.invaders.map((inv, i) =>
      i === 0 ? { ...inv, pos: { x: inv.pos.x, y: GAME_OVER_INVADER_Y + 5 } } : inv,
    );
    const events: GameEvent[] = [];
    const r = tickWave({ ...s, invaders: lowered }, NEUTRAL_INPUT, clock, events);
    expect(r.mode.kind).toBe('gameover');
    expect(events).toEqual([{ type: 'game_over' }]);
  });

  it('triggers game_over when lives <= 0 and not mid-death', () => {
    const s = { ...playing(), lives: 0 };
    const events: GameEvent[] = [];
    const r = tickWave(s, NEUTRAL_INPUT, clock, events);
    expect(r.mode.kind).toBe('gameover');
    expect(events).toEqual([{ type: 'game_over' }]);
  });

  it('does NOT trigger game_over while still mid-death animation', () => {
    const s = {
      ...playing(),
      lives: 0,
      player: { ...playing().player, deathAnimationFrames: 30 },
    };
    const r = tickWave(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('advances to next wave when all invaders dead', () => {
    const s = playing();
    const cleared = s.invaders.map((i) => ({ ...i, alive: false }));
    const events: GameEvent[] = [];
    const r = tickWave({ ...s, invaders: cleared }, NEUTRAL_INPUT, clock, events);
    expect(r.mode.kind).toBe('playing');
    if (r.mode.kind === 'playing') expect(r.mode.wave).toBe(2);
    expect(r.invaders.every((i) => i.alive)).toBe(true);
    expect(events.some((e) => e.type === 'wave_cleared')).toBe(true);
  });
});
