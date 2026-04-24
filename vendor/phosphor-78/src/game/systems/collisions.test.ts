import { describe, expect, it } from 'vitest';
import {
  DEATH_ANIMATION_FRAMES,
  tickCollisions,
} from '@/game/systems/collisions';
import { makeInitialFormation } from '@/game/systems/invaders';
import { initialState } from '@/game/state';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

function playing(): GameState {
  return {
    ...initialState(),
    mode: { kind: 'playing', wave: 1 },
    invaders: makeInitialFormation(),
  };
}

describe('tickCollisions', () => {
  it('does nothing on title screen', () => {
    const s = initialState();
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('player bullet hitting an alive invader kills it + emits event', () => {
    const base = playing();
    const target = base.invaders[0]!;
    const s: GameState = {
      ...base,
      playerBullet: {
        id: 'pb',
        pos: { x: target.pos.x + 4, y: target.pos.y + 2 },
        velocity: { x: 0, y: -4 },
      },
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.playerBullet).toBeNull();
    const hit = r.invaders[0]!;
    expect(hit.alive).toBe(false);
    expect(hit.killedAtFrame).toBe(s.frame);
    expect(events).toEqual([{ type: 'invader_killed', row: 0, col: 0 }]);
  });

  it('player bullet far from any invader does nothing', () => {
    const s: GameState = {
      ...playing(),
      playerBullet: {
        id: 'pb',
        pos: { x: 200, y: 220 }, // far from formation top-left
        velocity: { x: 0, y: -4 },
      },
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.playerBullet).not.toBeNull();
    expect(events).toEqual([]);
  });

  it('player bullet hitting an already-dead invader does NOT re-trigger', () => {
    const base = playing();
    const target = base.invaders[0]!;
    const s: GameState = {
      ...base,
      playerBullet: {
        id: 'pb',
        pos: { x: target.pos.x + 4, y: target.pos.y + 2 },
        velocity: { x: 0, y: -4 },
      },
      invaders: base.invaders.map((i, idx) =>
        idx === 0 ? { ...i, alive: false } : i,
      ),
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.playerBullet).not.toBeNull();
    expect(events).toEqual([]);
  });

  it('player bullet hitting active UFO emits ufo_killed with cycle-table score', () => {
    const base = playing();
    const s: GameState = {
      ...base,
      playerBullet: {
        id: 'pb',
        pos: { x: base.ufo.pos.x + 4, y: base.ufo.pos.y + 2 },
        velocity: { x: 0, y: -4 },
      },
      ufo: { ...base.ufo, active: true },
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.playerBullet).toBeNull();
    expect(r.ufo.active).toBe(false);
    // saucerHits was 0 → next hit (1st) awards 100 per the cycle table.
    expect(events).toEqual([{ type: 'ufo_killed', score: 100 }]);
  });

  it('invader bullet hitting alive player triggers death animation', () => {
    const base = playing();
    const s: GameState = {
      ...base,
      invaderBullets: [
        {
          id: 'ib',
          pos: { x: base.player.pos.x + 4, y: base.player.pos.y + 2 },
          velocity: { x: 0, y: 2 },
          kind: 'rolling',
          animationFrame: 0,
        },
      ],
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.player.alive).toBe(false);
    expect(r.player.deathAnimationFrames).toBe(DEATH_ANIMATION_FRAMES);
    expect(r.invaderBullets).toHaveLength(0);
    expect(events).toEqual([{ type: 'player_killed' }]);
  });

  it('invader bullet during death animation does NOT re-kill', () => {
    const base = playing();
    const s: GameState = {
      ...base,
      player: {
        ...base.player,
        alive: false,
        deathAnimationFrames: 30,
      },
      invaderBullets: [
        {
          id: 'ib',
          pos: { x: base.player.pos.x + 4, y: base.player.pos.y + 2 },
          velocity: { x: 0, y: 2 },
          kind: 'rolling',
          animationFrame: 0,
        },
      ],
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.player.deathAnimationFrames).toBe(30); // unchanged
    expect(r.invaderBullets).toHaveLength(1); // bullet not consumed
    expect(events).toEqual([]);
  });

  it('only the first colliding invader bullet kills the player', () => {
    const base = playing();
    const px = base.player.pos.x;
    const py = base.player.pos.y;
    const s: GameState = {
      ...base,
      invaderBullets: [
        {
          id: 'ib1',
          pos: { x: px + 4, y: py + 2 },
          velocity: { x: 0, y: 2 },
          kind: 'rolling',
          animationFrame: 0,
        },
        {
          id: 'ib2',
          pos: { x: px + 6, y: py + 3 },
          velocity: { x: 0, y: 2 },
          kind: 'plunger',
          animationFrame: 0,
        },
      ],
    };
    const events: GameEvent[] = [];
    const r = tickCollisions(s, NEUTRAL_INPUT, clock, events);
    expect(r.player.alive).toBe(false);
    // First bullet consumed; second one survives.
    expect(r.invaderBullets).toHaveLength(1);
    expect(r.invaderBullets[0]?.id).toBe('ib2');
    expect(events).toHaveLength(1);
  });
});
