import { describe, expect, it } from 'vitest';
import { tickUfo, UFO_SPAWN_COOLDOWN_FRAMES, UFO_Y } from '@/game/systems/ufo';
import { initialState } from '@/game/state';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

function playing() {
  return { ...initialState(), mode: { kind: 'playing' as const, wave: 1 } };
}

describe('tickUfo', () => {
  it('does nothing on title screen', () => {
    const s = initialState();
    const r = tickUfo(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('decrements spawn cooldown when inactive', () => {
    const s = {
      ...playing(),
      ufo: { ...playing().ufo, active: false, spawnCooldownFrames: 5 },
    };
    const r = tickUfo(s, NEUTRAL_INPUT, clock, []);
    expect(r.ufo.spawnCooldownFrames).toBe(4);
  });

  it('spawns when cooldown elapses and emits ufo_appeared', () => {
    const s = {
      ...playing(),
      ufo: { ...playing().ufo, active: false, spawnCooldownFrames: 0 },
    };
    const events: GameEvent[] = [];
    const r = tickUfo(s, NEUTRAL_INPUT, clock, events);
    expect(r.ufo.active).toBe(true);
    expect(r.ufo.pos.y).toBe(UFO_Y);
    expect(events).toEqual([{ type: 'ufo_appeared' }]);
  });

  it('moves and despawns at the far edge', () => {
    const base = playing();
    let s: GameState = {
      ...base,
      ufo: {
        ...base.ufo,
        active: true,
        pos: { x: 220, y: UFO_Y },
        direction: 'right',
        spawnCooldownFrames: 0,
      },
    };
    for (let i = 0; i < 100; i++) {
      s = tickUfo(s, NEUTRAL_INPUT, clock, []);
    }
    expect(s.ufo.active).toBe(false);
    // Despawn sets cooldown to UFO_SPAWN_COOLDOWN_FRAMES, then
    // subsequent ticks decrement it; we just check it's still
    // counting down toward the next spawn.
    expect(s.ufo.spawnCooldownFrames).toBeGreaterThan(0);
    expect(s.ufo.spawnCooldownFrames).toBeLessThanOrEqual(
      UFO_SPAWN_COOLDOWN_FRAMES,
    );
  });
});
