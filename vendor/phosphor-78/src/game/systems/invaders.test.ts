import { describe, expect, it } from 'vitest';
import {
  FORMATION_COLS,
  FORMATION_ROWS,
  makeInitialFormation,
  stepFrameInterval,
  tickInvaders,
} from '@/game/systems/invaders';
import { initialState } from '@/game/state';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

function withInvaders() {
  return {
    ...initialState(),
    mode: { kind: 'playing' as const, wave: 1 },
    invaders: makeInitialFormation(),
  };
}

describe('makeInitialFormation', () => {
  it('produces 5x11 = 55 invaders', () => {
    const f = makeInitialFormation();
    expect(f).toHaveLength(FORMATION_ROWS * FORMATION_COLS);
  });

  it('row 0 is top kind, rows 1-2 middle, rows 3-4 bottom', () => {
    const f = makeInitialFormation();
    const byRow = (r: number) => f.filter((i) => i.row === r);
    expect(byRow(0).every((i) => i.kind === 'top')).toBe(true);
    expect(byRow(1).every((i) => i.kind === 'middle')).toBe(true);
    expect(byRow(2).every((i) => i.kind === 'middle')).toBe(true);
    expect(byRow(3).every((i) => i.kind === 'bottom')).toBe(true);
    expect(byRow(4).every((i) => i.kind === 'bottom')).toBe(true);
  });

  it('all invaders are alive', () => {
    expect(makeInitialFormation().every((i) => i.alive)).toBe(true);
  });

  it('positions are unique', () => {
    const f = makeInitialFormation();
    const keys = new Set(f.map((i) => `${i.pos.x},${i.pos.y}`));
    expect(keys.size).toBe(f.length);
  });
});

describe('tickInvaders', () => {
  it('does nothing on title screen', () => {
    const s = { ...initialState(), invaders: makeInitialFormation() };
    const r = tickInvaders(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('does nothing with zero alive invaders', () => {
    const allDead = withInvaders();
    const s = {
      ...allDead,
      invaders: allDead.invaders.map((i) => ({ ...i, alive: false })),
    };
    const r = tickInvaders(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('does not mutate input state', () => {
    const s = withInvaders();
    const before = s.invaders[0]?.pos.x;
    tickInvaders(s, NEUTRAL_INPUT, clock, []);
    expect(s.invaders[0]?.pos.x).toBe(before);
  });

  it('stepFrameInterval is monotonic in 1/N (faster as N decreases)', () => {
    const a = stepFrameInterval(55);
    const b = stepFrameInterval(10);
    const c = stepFrameInterval(1);
    expect(a).toBeGreaterThanOrEqual(b);
    expect(b).toBeGreaterThanOrEqual(c);
  });

  // Story 5.14: stepFrameInterval is now ROM-derived. The exact
  // values come from MARCH_TEMPO_TABLE: row "≥50" = 52 interrupts,
  // row "1" = 5 interrupts. Pin those so a future tweak that
  // accidentally re-introduces the old placeholder math fails.
  it('stepFrameInterval matches MARCH_TEMPO_TABLE for boundary cases', () => {
    expect(stepFrameInterval(55)).toBe(52); // wave start
    expect(stepFrameInterval(50)).toBe(52); // top of table
    expect(stepFrameInterval(10)).toBe(19);
    expect(stepFrameInterval(1)).toBe(5); // last alien — fastest
  });
});
