import { describe, expect, it } from 'vitest';
import {
  INVADER_FIRE_INTERVAL_FRAMES,
  MAX_INVADER_BULLETS,
  SCREEN_BOTTOM_Y,
  chooseShotKind,
  pickShooter,
  tickBullets,
} from '@/game/systems/bullets';
import { makeInitialFormation } from '@/game/systems/invaders';
import { initialState } from '@/game/state';
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

describe('tickBullets', () => {
  it('advances player bullet upward', () => {
    const s = {
      ...playing(),
      playerBullet: {
        id: 'p',
        pos: { x: 100, y: 200 },
        velocity: { x: 0, y: -4 },
      },
    };
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    expect(r.playerBullet?.pos.y).toBe(196);
    expect(r.playerBullet?.pos.x).toBe(100);
  });

  it('drops player bullet when it leaves the top of the screen', () => {
    const s = {
      ...playing(),
      playerBullet: {
        id: 'p',
        pos: { x: 100, y: 2 },
        velocity: { x: 0, y: -4 },
      },
    };
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    expect(r.playerBullet).toBeNull();
  });

  it('drops invader bullets that fall below the screen', () => {
    const s = {
      ...playing(),
      invaderBullets: [
        {
          id: 'ib',
          pos: { x: 50, y: SCREEN_BOTTOM_Y - 1 },
          velocity: { x: 0, y: 2 },
          kind: 'rolling' as const,
          animationFrame: 0,
        },
      ],
    };
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    expect(r.invaderBullets).toHaveLength(0);
  });

  it('cycles invader bullet animation frame', () => {
    const s = {
      ...playing(),
      invaderBullets: [
        {
          id: 'ib',
          pos: { x: 50, y: 100 },
          velocity: { x: 0, y: 2 },
          kind: 'plunger' as const,
          animationFrame: 3,
        },
      ],
    };
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    expect(r.invaderBullets[0]?.animationFrame).toBe(0);
  });

  it('spawns at most MAX_INVADER_BULLETS at once', () => {
    let s = playing();
    s = { ...s, frame: INVADER_FIRE_INTERVAL_FRAMES };
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    expect(r.invaderBullets.length).toBeLessThanOrEqual(MAX_INVADER_BULLETS);
  });

  it('does nothing on title screen', () => {
    const s = initialState();
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });
});

describe('chooseShotKind (3-state cycle + plunger skip)', () => {
  it('cycles rolling -> plunger -> squiggly', () => {
    expect(chooseShotKind(0, 55)).toBe('rolling');
    expect(chooseShotKind(1, 55)).toBe('plunger');
    expect(chooseShotKind(2, 55)).toBe('squiggly');
    expect(chooseShotKind(3, 55)).toBe('rolling');
  });

  it('skips plunger when only one alien is left', () => {
    expect(chooseShotKind(1, 1)).not.toBe('plunger');
    expect(chooseShotKind(1, 1)).toBe('squiggly');
  });

  it('plunger still fires when 2+ aliens are alive', () => {
    expect(chooseShotKind(1, 2)).toBe('plunger');
  });
});

describe('pickShooter', () => {
  it('rolling targets the column closest to the player', () => {
    const s = {
      ...initialState(),
      mode: { kind: 'playing' as const, wave: 1 },
      invaders: makeInitialFormation(),
      player: {
        ...initialState().player,
        pos: { x: 200, y: 216 },
      },
    };
    const pos = pickShooter(s, 'rolling');
    expect(pos).not.toBeNull();
    // The rightmost column in our formation is col 10 at base x =
    // 24 + 10*16 = 184. Player center is x=208 — closest column is
    // 10, so shooter x should be 184.
    expect(pos!.x).toBe(184);
  });

  it('plunger uses the deterministic column rotation', () => {
    const s = {
      ...initialState(),
      mode: { kind: 'playing' as const, wave: 1 },
      invaders: makeInitialFormation(),
      frame: INVADER_FIRE_INTERVAL_FRAMES, // cycleIdx = 1
    };
    const pos = pickShooter(s, 'plunger');
    expect(pos).not.toBeNull();
  });

  it('returns null when no aliens are alive', () => {
    const s = {
      ...initialState(),
      mode: { kind: 'playing' as const, wave: 1 },
      invaders: makeInitialFormation().map((i) => ({ ...i, alive: false })),
    };
    expect(pickShooter(s, 'rolling')).toBeNull();
  });
});

describe('squiggly trajectory weaves left-right', () => {
  it('moves horizontally as well as down', () => {
    const s = {
      ...initialState(),
      mode: { kind: 'playing' as const, wave: 1 },
      invaderBullets: [
        {
          id: 'ib',
          pos: { x: 100, y: 50 },
          velocity: { x: 0, y: 2 },
          kind: 'squiggly' as const,
          animationFrame: 0,
        },
      ],
    };
    const r = tickBullets(s, NEUTRAL_INPUT, clock, []);
    // After one tick, y advanced by 2 and x changed (sine offset
    // at frame 1 is non-zero).
    expect(r.invaderBullets[0]?.pos.y).toBe(52);
    // The first sine-offset delta is approximately sin(2*pi/16) * 4 -
    // sin(0) * 4 ~= 1.5, rounded to 2.
    expect(r.invaderBullets[0]?.pos.x).not.toBe(100);
  });
});
