import { describe, expect, it } from 'vitest';
import {
  ALIEN_TOTAL,
  INTERRUPT_PERIOD_MS,
  MARCH_TEMPO_TABLE,
  marchDelayInterrupts,
  nextStepInterval,
} from '@/constants/computer-archeology';

describe('hardware constants', () => {
  it('interrupt period is 1/60 s', () => {
    expect(INTERRUPT_PERIOD_MS).toBeCloseTo(1000 / 60, 6);
  });
});

describe('MARCH_TEMPO_TABLE', () => {
  it('has the 16 rows the disassembly defines', () => {
    expect(MARCH_TEMPO_TABLE).toHaveLength(16);
  });

  it('alien thresholds are strictly decreasing (table scan order)', () => {
    for (let i = 1; i < MARCH_TEMPO_TABLE.length; i++) {
      const prev = MARCH_TEMPO_TABLE[i - 1]!;
      const cur = MARCH_TEMPO_TABLE[i]!;
      expect(cur.minAliveAliens).toBeLessThan(prev.minAliveAliens);
    }
  });

  it('delays are also strictly decreasing (faster as aliens die)', () => {
    for (let i = 1; i < MARCH_TEMPO_TABLE.length; i++) {
      const prev = MARCH_TEMPO_TABLE[i - 1]!;
      const cur = MARCH_TEMPO_TABLE[i]!;
      expect(cur.delayInterrupts).toBeLessThan(prev.delayInterrupts);
    }
  });

  it('first row matches the disassembly: 50 / 52', () => {
    expect(MARCH_TEMPO_TABLE[0]).toEqual({ minAliveAliens: 50, delayInterrupts: 52 });
  });

  it('last row matches the disassembly: 1 / 5', () => {
    expect(MARCH_TEMPO_TABLE[15]).toEqual({ minAliveAliens: 1, delayInterrupts: 5 });
  });
});

describe('marchDelayInterrupts (1:1 disassembly check)', () => {
  // Each (aliveCount, expectedDelay) pair below is derived from the
  // MARCH_TEMPO_TABLE algorithm: scan top-to-bottom, return the
  // delay of the first row whose minAliveAliens <= aliveCount. We
  // hand-verify each boundary against the disassembly table at
  // Code.html:3945-3946.
  const cases: ReadonlyArray<readonly [aliveCount: number, expectedDelay: number]> = [
    // Full wave + leeway above the table.
    [55, 52],
    [51, 52],
    [50, 52], // boundary: hits row 0
    // Row 1: 43..49 -> 46
    [49, 46],
    [43, 46],
    // Row 2: 36..42 -> 39
    [42, 39],
    [36, 39],
    // Row 3: 28..35 -> 34
    [35, 34],
    [28, 34],
    // Row 4: 22..27 -> 28
    [27, 28],
    [22, 28],
    // Row 5: 17..21 -> 24
    [21, 24],
    [17, 24],
    // Row 6: 13..16 -> 21
    [16, 21],
    [13, 21],
    // Row 7: 10..12 -> 19
    [12, 19],
    [10, 19],
    // Row 8: 8..9 -> 16
    [9, 16],
    [8, 16],
    // Row 9: 7 -> 14
    [7, 14],
    // Row 10: 6 -> 13
    [6, 13],
    // Row 11: 5 -> 12
    [5, 12],
    // Row 12: 4 -> 11
    [4, 11],
    // Row 13: 3 -> 9
    [3, 9],
    // Row 14: 2 -> 7
    [2, 7],
    // Row 15: 1 -> 5
    [1, 5],
  ];

  it.each(cases)('aliveCount=%i -> delay=%i interrupts', (alive, expected) => {
    expect(marchDelayInterrupts(alive)).toBe(expected);
  });

  it('covers every alive count in [1, 55] without throwing', () => {
    for (let n = 1; n <= 55; n++) {
      const d = marchDelayInterrupts(n);
      expect(Number.isInteger(d)).toBe(true);
      expect(d).toBeGreaterThanOrEqual(5);
      expect(d).toBeLessThanOrEqual(52);
    }
  });

  it('aliveCount=0 returns the fastest row safely', () => {
    expect(marchDelayInterrupts(0)).toBe(5);
  });
});

describe('nextStepInterval (ms wrapper)', () => {
  it('multiplies the table delay by INTERRUPT_PERIOD_MS', () => {
    // Spot-check: 55 alive -> row 0, 52 interrupts.
    expect(nextStepInterval(55)).toBeCloseTo(52 * INTERRUPT_PERIOD_MS, 4);
    // 1 alive -> row 15, 5 interrupts.
    expect(nextStepInterval(1)).toBeCloseTo(5 * INTERRUPT_PERIOD_MS, 4);
  });

  it('monotonically decreases as aliens die', () => {
    let prev = Infinity;
    for (let n = 55; n >= 1; n--) {
      const cur = nextStepInterval(n);
      expect(cur).toBeLessThanOrEqual(prev);
      prev = cur;
    }
  });
});

describe('ALIEN_TOTAL', () => {
  it('is 55 (5 rows x 11 cols, per Code.html:3941)', () => {
    expect(ALIEN_TOTAL).toBe(55);
  });
});

import {
  SAUCER_SCORE_CYCLE_LENGTH,
  SAUCER_SCORE_CYCLE_RAW,
  decodeSaucerScore,
  saucerScoreForHit,
} from '@/constants/computer-archeology';

describe('decodeSaucerScore (BCD)', () => {
  it('0x05 -> 50 points', () => {
    expect(decodeSaucerScore(0x05)).toBe(50);
  });
  it('0x10 -> 100 points', () => {
    expect(decodeSaucerScore(0x10)).toBe(100);
  });
  it('0x15 -> 150 points', () => {
    expect(decodeSaucerScore(0x15)).toBe(150);
  });
  it('0x30 -> 300 points', () => {
    expect(decodeSaucerScore(0x30)).toBe(300);
  });
});

describe('SAUCER_SCORE_CYCLE_RAW', () => {
  it('has 15 entries (the 16th is unreachable per the bug)', () => {
    expect(SAUCER_SCORE_CYCLE_RAW).toHaveLength(15);
    expect(SAUCER_SCORE_CYCLE_LENGTH).toBe(15);
  });

  it('entry 8 (the 9th hit, 0-indexed 8) is 0x30 = 300', () => {
    expect(SAUCER_SCORE_CYCLE_RAW[8]).toBe(0x30);
  });
});

describe('saucerScoreForHit (1:1 disassembly)', () => {
  // 1-indexed expected scores for hits 1..15:
  const expected = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100];

  it.each(expected.map((s, i) => [i + 1, s] as const))(
    'hit %i awards %i points',
    (hit, points) => {
      expect(saucerScoreForHit(hit)).toBe(points);
    },
  );

  it('cycles every 15 hits', () => {
    expect(saucerScoreForHit(16)).toBe(saucerScoreForHit(1));
    expect(saucerScoreForHit(24)).toBe(saucerScoreForHit(9));
    // The famous one: every (n*15 + 9)th hit gives 300.
    expect(saucerScoreForHit(9)).toBe(300);
    expect(saucerScoreForHit(24)).toBe(300);
    expect(saucerScoreForHit(39)).toBe(300);
  });

  it('returns 0 for non-positive hit counts', () => {
    expect(saucerScoreForHit(0)).toBe(0);
    expect(saucerScoreForHit(-1)).toBe(0);
  });
});

import {
  SHIELD_HEIGHT_PX,
  SHIELD_ROM_BYTES,
  SHIELD_WIDTH_PX,
  shieldRomToRowMajor,
} from '@/constants/computer-archeology';

describe('SHIELD_ROM_BYTES (1:1 with ROM $1D20)', () => {
  it('has exactly 44 bytes (22 cols x 2 bytes/col)', () => {
    expect(SHIELD_ROM_BYTES).toHaveLength(44);
    expect(SHIELD_ROM_BYTES.length).toBe(SHIELD_WIDTH_PX * 2);
  });

  it('first byte pair matches the ROM dump (0xFF, 0x0F)', () => {
    expect(SHIELD_ROM_BYTES[0]).toBe(0xff);
    expect(SHIELD_ROM_BYTES[1]).toBe(0x0f);
  });

  it('center column matches the rounded-top arch shape', () => {
    expect(SHIELD_ROM_BYTES[11 * 2]).toBe(0xf0);
    expect(SHIELD_ROM_BYTES[11 * 2 + 1]).toBe(0xff);
  });

  it('center columns are solid (col 11 = F0/FF, col 12 = F0/FF)', () => {
    expect(SHIELD_ROM_BYTES[11 * 2]).toBe(0xf0);
    expect(SHIELD_ROM_BYTES[11 * 2 + 1]).toBe(0xff);
    expect(SHIELD_ROM_BYTES[12 * 2]).toBe(0xf0);
    expect(SHIELD_ROM_BYTES[12 * 2 + 1]).toBe(0xff);
  });

  it('last byte pair is FF 0F (col 21)', () => {
    expect(SHIELD_ROM_BYTES[42]).toBe(0xff);
    expect(SHIELD_ROM_BYTES[43]).toBe(0x0f);
  });

  it('cols 5/6/7 are NOT byte-mirrors of cols 14/15/16 (rotation artifact)', () => {
    // The DRAWN shield is symmetric. The MEMORY bytes are not
    // pair-by-pair mirror-symmetric: the rounding bytes (0xFC/0xF8/
    // 0xF0) live in the top byte of left-side cols but ALSO in the
    // top byte of right-side cols (shifted by one column). So the
    // pair check fails for the rounding cols.
    expect(SHIELD_ROM_BYTES[10]).toBe(0xfc); // col 5 top
    expect(SHIELD_ROM_BYTES[32]).toBe(0xff); // col 16 top — different
    expect(SHIELD_ROM_BYTES[12]).toBe(0xf8); // col 6 top
    expect(SHIELD_ROM_BYTES[30]).toBe(0xfc); // col 15 top — different
  });
});

describe('shieldRomToRowMajor', () => {
  it('produces a 22x16 packed buffer (3 bytes per row x 16 rows = 48)', () => {
    const out = shieldRomToRowMajor();
    expect(out).toHaveLength(48);
  });

  it('per-row pixel counts match a counted-from-ROM diff baseline', () => {
    const out = shieldRomToRowMajor();
    const setPerRow: number[] = [];
    for (let y = 0; y < SHIELD_HEIGHT_PX; y++) {
      let count = 0;
      for (let x = 0; x < SHIELD_WIDTH_PX; x++) {
        const byteIdx = y * 3 + (x >> 3);
        const bitIdx = 7 - (x & 7);
        if (((out[byteIdx] ?? 0) >> bitIdx) & 1) count++;
      }
      setPerRow.push(count);
    }
    // Independently compute expected by walking the ROM bytes.
    const expected: number[] = new Array(SHIELD_HEIGHT_PX).fill(0);
    for (let col = 0; col < SHIELD_WIDTH_PX; col++) {
      const top = SHIELD_ROM_BYTES[col * 2] ?? 0;
      const bot = SHIELD_ROM_BYTES[col * 2 + 1] ?? 0;
      for (let r = 0; r < 8; r++) {
        if ((top >> r) & 1) expected[r] = (expected[r] ?? 0) + 1;
        if ((bot >> r) & 1) expected[r + 8] = (expected[r + 8] ?? 0) + 1;
      }
    }
    expect(setPerRow).toEqual(expected);
  });

  it('first column conversion: bit 0 of top byte (0xFF) maps to row 0', () => {
    const out = shieldRomToRowMajor();
    // x=0, y=0 -> byte 0, bit 7 (MSB).
    expect((out[0] ?? 0) & 0x80).toBe(0x80);
  });
});

import {
  ALIEN_SCORE_BOTTOM,
  ALIEN_SCORE_MIDDLE,
  ALIEN_SCORE_TOP,
  EXTRA_LIFE_AT,
  SCORE_WRAP,
} from '@/constants/computer-archeology';

describe('alien score table (1:1 with ROM $1DA0-$1DA2)', () => {
  it('top row (highest) = 30', () => {
    expect(ALIEN_SCORE_TOP).toBe(30);
  });
  it('middle rows = 20', () => {
    expect(ALIEN_SCORE_MIDDLE).toBe(20);
  });
  it('bottom 2 rows = 10', () => {
    expect(ALIEN_SCORE_BOTTOM).toBe(10);
  });
  it('matches the BCD pattern exactly: 30 > 20 > 10', () => {
    expect(ALIEN_SCORE_TOP).toBeGreaterThan(ALIEN_SCORE_MIDDLE);
    expect(ALIEN_SCORE_MIDDLE).toBeGreaterThan(ALIEN_SCORE_BOTTOM);
  });
});

describe('EXTRA_LIFE_AT (default DIP setting)', () => {
  it('is 1500 (Code.html:1615 default, not the 1000 alternative)', () => {
    expect(EXTRA_LIFE_AT).toBe(1500);
  });
});

describe('SCORE_WRAP', () => {
  it('wraps at 10000 (4 BCD digits = 9999 max)', () => {
    expect(SCORE_WRAP).toBe(10_000);
  });
});
