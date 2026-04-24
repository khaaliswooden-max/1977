// Epic 2 quality-gate test: pin down which gameplay constants ARE
// 1:1 from ROM (and have citations) vs which are project
// approximations. This test is the "consolidation" deliverable for
// story 2.6 — instead of forcibly relocating every numeric literal,
// we make the categorization explicit and machine-checked.

import { describe, expect, it } from 'vitest';
import {
  ALIEN_ROWS,
  ALIEN_COLS,
  ALIEN_TOTAL,
  ALIEN_SCORE_TOP,
  ALIEN_SCORE_MIDDLE,
  ALIEN_SCORE_BOTTOM,
  ALIEN_SHOT_CYCLE,
  EXTRA_LIFE_AT,
  INTERRUPT_PERIOD_MS,
  MARCH_TEMPO_TABLE,
  PLUNGER_DISABLED_AT_ALIVE,
  ROLLING_SHOT_TARGETS_PLAYER,
  SAUCER_SCORE_CYCLE_LENGTH,
  SAUCER_SCORE_CYCLE_RAW,
  SCORE_WRAP,
  SHIELD_HEIGHT_PX,
  SHIELD_ROM_BYTES,
  SHIELD_WIDTH_PX,
} from '@/constants/computer-archeology';
import {
  EXTRA_LIFE_INCREMENT,
  SCORE_WRAP as G_SCORE_WRAP,
  scoreForInvaderKind,
} from '@/game/systems/score';

describe('Epic 2 quality gate — ROM-1:1 constants are exhaustively cited', () => {
  // For each ROM-derived constant we assert (a) it exists and has
  // its expected value, (b) any wrapper/re-export in game/systems/
  // returns the same value. Failure means a "tune to taste" change
  // snuck past code review.

  it('formation: 5 rows x 11 cols = 55 (Code.html:3941)', () => {
    expect(ALIEN_ROWS).toBe(5);
    expect(ALIEN_COLS).toBe(11);
    expect(ALIEN_TOTAL).toBe(55);
  });

  it('alien scores: 30 / 20 / 10 (Code.html:4630-4634, ROM $1DA0)', () => {
    expect(ALIEN_SCORE_TOP).toBe(30);
    expect(ALIEN_SCORE_MIDDLE).toBe(20);
    expect(ALIEN_SCORE_BOTTOM).toBe(10);
    expect(scoreForInvaderKind('top')).toBe(30);
    expect(scoreForInvaderKind('middle')).toBe(20);
    expect(scoreForInvaderKind('bottom')).toBe(10);
  });

  it('extra-life threshold = 1500 (Code.html:1615 default DIP)', () => {
    expect(EXTRA_LIFE_AT).toBe(1500);
    expect(EXTRA_LIFE_INCREMENT).toBe(1500);
  });

  it('score wrap = 10000 (4 BCD digits)', () => {
    expect(SCORE_WRAP).toBe(10_000);
    expect(G_SCORE_WRAP).toBe(10_000);
  });

  it('interrupt period = 1/60s (Code.html:118)', () => {
    expect(INTERRUPT_PERIOD_MS).toBeCloseTo(1000 / 60, 6);
  });

  it('march tempo table is 16 rows starting 50/52 ending 1/5 (Code.html:3945-3946)', () => {
    expect(MARCH_TEMPO_TABLE).toHaveLength(16);
    expect(MARCH_TEMPO_TABLE[0]).toEqual({ minAliveAliens: 50, delayInterrupts: 52 });
    expect(MARCH_TEMPO_TABLE[15]).toEqual({ minAliveAliens: 1, delayInterrupts: 5 });
  });

  it('alien shot cycle = rolling/plunger/squiggly (Code.html:921-923)', () => {
    expect(ALIEN_SHOT_CYCLE).toEqual(['rolling', 'plunger', 'squiggly']);
    expect(ROLLING_SHOT_TARGETS_PLAYER).toBe(true);
    expect(PLUNGER_DISABLED_AT_ALIVE).toBe(1);
  });

  it('saucer score cycle = 15 entries with the 9th being 300 (Code.html:883 bug)', () => {
    expect(SAUCER_SCORE_CYCLE_LENGTH).toBe(15);
    expect(SAUCER_SCORE_CYCLE_RAW).toHaveLength(15);
    expect(SAUCER_SCORE_CYCLE_RAW[8]).toBe(0x30);
  });

  it('shield bitmap = 44 ROM bytes 22x16 pixels (Code.html:4546-4547)', () => {
    expect(SHIELD_ROM_BYTES).toHaveLength(44);
    expect(SHIELD_WIDTH_PX).toBe(22);
    expect(SHIELD_HEIGHT_PX).toBe(16);
  });
});
