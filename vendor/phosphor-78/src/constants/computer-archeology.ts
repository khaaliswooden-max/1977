// ComputerArcheology-derived 1:1 constants. Each export must cite
// the line(s) in references/computer-archeology/Code.html (or
// Hardware.html / RAMUse.html) it was extracted from. CR12.
//
// Source snapshot is locked to git tag `reference-snapshot-v1`.
// Any update requires a new reference-snapshot-vN tag and a story
// that explicitly handles the diff.

// ─────────────────────────────────────────────────────────────────
// Hardware timing
// ─────────────────────────────────────────────────────────────────

/**
 * The 1978 hardware fires the VBLANK interrupt at line 224, then a
 * second interrupt at the bottom of the screen. The CPU clock is
 * 2 MHz and the screen redraws at 60 Hz, so each interrupt is
 * effectively 1/60 second. Movement and the sound-tempo table both
 * count in these interrupt ticks.
 *
 * Source: references/computer-archeology/Code.html:118 ("Interrupt
 * brings us here when the beam is at the end of the screen (line
 * 224) when the VBLANK begins.")
 */
export const INTERRUPT_PERIOD_MS = 1000 / 60;

// ─────────────────────────────────────────────────────────────────
// March-tempo table (the famous "speeds up as aliens die" loop)
// ─────────────────────────────────────────────────────────────────

/**
 * Two parallel tables at $1A11 / $1A21 (Code.html:3945-3946). The
 * first column is alien-count thresholds (descending), the second
 * is the corresponding delay in interrupt ticks for the 4-note
 * march-step sound. The original game scans top-to-bottom and uses
 * the first row whose alien count is <= the current alive count.
 *
 * The disassembler comment notes: "The game starts with 55 aliens.
 * The aliens are move/drawn one per interrupt which means it takes
 * 55 interrupts. The first delay value is 52 ... which is almost
 * in sync with the number of aliens. It is a tad faster and you
 * can observe the sound and steps getting out of sync."
 *
 * Source: references/computer-archeology/Code.html:3937-3947
 */
export const MARCH_TEMPO_TABLE: ReadonlyArray<{
  readonly minAliveAliens: number;
  readonly delayInterrupts: number;
}> = Object.freeze([
  { minAliveAliens: 50, delayInterrupts: 52 }, // 0x32 / 0x34
  { minAliveAliens: 43, delayInterrupts: 46 }, // 0x2B / 0x2E
  { minAliveAliens: 36, delayInterrupts: 39 }, // 0x24 / 0x27
  { minAliveAliens: 28, delayInterrupts: 34 }, // 0x1C / 0x22
  { minAliveAliens: 22, delayInterrupts: 28 }, // 0x16 / 0x1C
  { minAliveAliens: 17, delayInterrupts: 24 }, // 0x11 / 0x18
  { minAliveAliens: 13, delayInterrupts: 21 }, // 0x0D / 0x15
  { minAliveAliens: 10, delayInterrupts: 19 }, // 0x0A / 0x13
  { minAliveAliens: 8, delayInterrupts: 16 }, // 0x08 / 0x10
  { minAliveAliens: 7, delayInterrupts: 14 }, // 0x07 / 0x0E
  { minAliveAliens: 6, delayInterrupts: 13 }, // 0x06 / 0x0D
  { minAliveAliens: 5, delayInterrupts: 12 }, // 0x05 / 0x0C
  { minAliveAliens: 4, delayInterrupts: 11 }, // 0x04 / 0x0B
  { minAliveAliens: 3, delayInterrupts: 9 }, //  0x03 / 0x09
  { minAliveAliens: 2, delayInterrupts: 7 }, //  0x02 / 0x07
  { minAliveAliens: 1, delayInterrupts: 5 }, //  0x01 / 0x05
]);

/**
 * Look up the delay (in interrupt ticks) for the next march-step
 * note given how many aliens are alive. Implements the original
 * "first row whose threshold is <= aliveCount" scan.
 *
 * Defined for any non-negative N. Above 50 (i.e. wave-start with
 * all 55 aliens) we fall through to the 50-row, mirroring the
 * original ROM's "always at least row 0" behavior.
 */
export function marchDelayInterrupts(aliveAliens: number): number {
  for (const row of MARCH_TEMPO_TABLE) {
    if (aliveAliens >= row.minAliveAliens) return row.delayInterrupts;
  }
  // Fewer than 1 alive (= no aliens at all) — caller shouldn't be
  // asking for a tempo, but return the fastest row for safety.
  const last = MARCH_TEMPO_TABLE[MARCH_TEMPO_TABLE.length - 1];
  return last?.delayInterrupts ?? 5;
}

/**
 * Clock-friendly form: ms between successive march-step notes for
 * the given alive-alien count. Wraps marchDelayInterrupts.
 *
 * Story 1.8 named this `nextStepInterval(N)` in the AudioClock
 * options; we re-export under that name for back-compat.
 */
export function nextStepInterval(aliveAliens: number): number {
  return marchDelayInterrupts(aliveAliens) * INTERRUPT_PERIOD_MS;
}

// ─────────────────────────────────────────────────────────────────
// Formation
// ─────────────────────────────────────────────────────────────────

/**
 * The original wave starts with a 5-row, 11-column formation = 55
 * aliens. Source: Code.html:3941 ("The game starts with 55 aliens").
 */
export const ALIEN_ROWS = 5;
export const ALIEN_COLS = 11;
export const ALIEN_TOTAL = ALIEN_ROWS * ALIEN_COLS;

// ─────────────────────────────────────────────────────────────────
// Invader shot behavior
// ─────────────────────────────────────────────────────────────────

/**
 * Three alien shot types are time-multiplexed by a single 3-state
 * timer so at most one new shot is fired each cycle:
 *   timer == 0 -> rolling-shot runs
 *   timer == 1 -> plunger-shot runs
 *   timer == 2 -> squiggly-shot runs
 *
 * Source: Code.html:921-923.
 *
 * Each shot keeps a step counter cross-referenced from the previous
 * tick's other shots so they don't all fire on the same column;
 * Code.html:972 / Code.html:974 show the cross-references.
 */
export type AlienShotKind = 'rolling' | 'plunger' | 'squiggly';
export const ALIEN_SHOT_CYCLE: ReadonlyArray<AlienShotKind> = Object.freeze([
  'rolling',
  'plunger',
  'squiggly',
]);

/**
 * Rolling shot is the only one that "targets player specifically"
 * (Code.html:910); the column it picks is whichever alive alien
 * column is closest to the player's current x. The other two pick
 * by step-counter cross-reference and fire from a deterministic
 * column rotation.
 */
export const ROLLING_SHOT_TARGETS_PLAYER = true;

/**
 * Plunger shot is disabled when only one alien remains, so the
 * final solo alien only ever fires rolling + squiggly. This is the
 * detail responsible for the late-game "single fast alien firing
 * from the side" feel.
 *
 * Source: Code.html:995-996 ("Disable plunger shot ... when only
 * one alien remains").
 */
export const PLUNGER_DISABLED_AT_ALIVE = 1;

/** Animation cycle length for invader shot sprites (4 frames). */
export const ALIEN_SHOT_ANIMATION_FRAMES = 4;

/**
 * Per-tick downward speed of an invader shot. The disassembly
 * computes it implicitly via HandleAlienShot ($0563) sprite
 * stepping; we approximate at 2px/tick which matches the visual
 * cadence of the original at 60Hz.
 */
export const ALIEN_SHOT_SPEED_PX_PER_TICK = 2;

// ─────────────────────────────────────────────────────────────────
// Saucer (UFO) scoring — "every 15 hits = 300" cycle
// ─────────────────────────────────────────────────────────────────

/**
 * The 16-byte score-cycle table at ROM address $1D54
 * (Code.html:4560). Each saucer-hit advances a pointer one byte
 * through this table. Values are BCD scores: 0x05 = 50 points,
 * 0x10 = 100, 0x15 = 150, 0x30 = 300.
 *
 * The famous "every 15 hits = 300" pattern comes from a bug
 * documented at Code.html:883:
 *   CP $63 ; ... the end at 1D63 (bug! this should be $64 to
 *   cover all 16 values)
 * The wrap check uses `< $63` instead of `< $64`, so the 16th
 * byte is never read — the cycle is effectively length 15. Entry
 * 8 (the 9th hit) is `0x30` = 300, and after 15 hits the cycle
 * restarts. This means a player can deterministically score 300
 * by counting their saucer hits.
 *
 * We faithfully reproduce the bug. If a future version intends to
 * "fix" it, that's a deliberate behavior change worth its own
 * story.
 */
export const SAUCER_SCORE_CYCLE_RAW: ReadonlyArray<number> = Object.freeze([
  0x10, // hit 1  -> 100
  0x05, // hit 2  -> 50
  0x05, // hit 3  -> 50
  0x10, // hit 4  -> 100
  0x15, // hit 5  -> 150
  0x10, // hit 6  -> 100
  0x10, // hit 7  -> 100
  0x05, // hit 8  -> 50
  0x30, // hit 9  -> 300  <-- the famous one
  0x10, // hit 10 -> 100
  0x10, // hit 11 -> 100
  0x10, // hit 12 -> 100
  0x05, // hit 13 -> 50
  0x15, // hit 14 -> 150
  0x10, // hit 15 -> 100
  // entry 16 (0x05) is never reached due to the wrap-check bug.
]);

/** Effective cycle length: 15, not 16, per the bug at Code.html:883. */
export const SAUCER_SCORE_CYCLE_LENGTH = 15;

/** Decode a raw BCD score byte to its decimal point value. */
export function decodeSaucerScore(rawByte: number): number {
  // Each nibble holds a decimal digit (BCD), then *10 to get points.
  // 0x05 -> 5 -> 50; 0x10 -> 10 -> 100; 0x15 -> 15 -> 150; 0x30 -> 30 -> 300.
  const tens = (rawByte >> 4) & 0xf;
  const ones = rawByte & 0xf;
  return (tens * 10 + ones) * 10;
}

/**
 * Score awarded for hitting the saucer for the Nth time (1-indexed).
 * Implements the original buggy 15-entry cycle.
 */
export function saucerScoreForHit(hitIndex1Based: number): number {
  if (hitIndex1Based < 1) return 0;
  const cycleSlot = (hitIndex1Based - 1) % SAUCER_SCORE_CYCLE_LENGTH;
  const raw = SAUCER_SCORE_CYCLE_RAW[cycleSlot] as number;
  return decodeSaucerScore(raw);
}

/**
 * Saucer cadence: the disassembly schedules the saucer via
 * "TimeToSaucer" countdowns (Code.html:175, $0913). The exact
 * countdown value the original game uses is in a table we haven't
 * extracted yet; for now we keep ~25s as established in story 1.15.
 */
export const SAUCER_SPAWN_INTERVAL_FRAMES = 1500; // ~25s at 60Hz

// ─────────────────────────────────────────────────────────────────
// Shield bitmap (1:1 from ROM $1D20)
// ─────────────────────────────────────────────────────────────────

/**
 * The original 1978 shield bitmap, exactly as stored at ROM $1D20.
 *
 * Source: Code.html:4546-4547 (the bytes immediately following the
 * label at $1D20):
 *   1D20: FF 0F FF 1F FF 3F FF 7F FF FF FC FF F8 FF F0 FF
 *         F0 FF F0 FF F0 FF F0 FF F0 FF F0 FF F8 FF FC FF
 *         FF FF FF 7F FF 3F FF 1F FF 0F
 *
 * Format: column-major. The 1978 cabinet has the CRT physically
 * rotated 90 degrees, so video memory is organized as vertical
 * 8-pixel strips. A 22-wide x 16-tall shield is laid out as 22
 * columns x 2 bytes per column = 44 bytes. Byte k of column N
 * holds 8 vertical pixels with bit 0 = topmost and bit 7 = bottom-
 * most of that 8-pixel slice. So for column N:
 *   byte 2N     covers rows 0-7
 *   byte 2N + 1 covers rows 8-15
 *
 * Use shieldRomToRowMajor() to convert into the row-major bit
 * layout the rest of the codebase uses.
 */
export const SHIELD_ROM_BYTES: ReadonlyArray<number> = Object.freeze([
  // Line 4546 ($1D20-$1D35), 22 bytes = cols 0-10:
  // FF 0F FF 1F FF 3F FF 7F FF FF FC FF F8 FF F0 FF F0 FF F0 FF F0 FF
  0xff, 0x0f, // col 0
  0xff, 0x1f, // col 1
  0xff, 0x3f, // col 2
  0xff, 0x7f, // col 3
  0xff, 0xff, // col 4
  0xfc, 0xff, // col 5
  0xf8, 0xff, // col 6
  0xf0, 0xff, // col 7
  0xf0, 0xff, // col 8
  0xf0, 0xff, // col 9
  0xf0, 0xff, // col 10
  // Line 4547 ($1D36-$1D4B), 22 bytes = cols 11-21:
  // F0 FF F0 FF F0 FF F8 FF FC FF FF FF FF FF FF 7F FF 3F FF 1F FF 0F
  0xf0, 0xff, // col 11
  0xf0, 0xff, // col 12
  0xf0, 0xff, // col 13
  0xf8, 0xff, // col 14
  0xfc, 0xff, // col 15
  0xff, 0xff, // col 16
  0xff, 0xff, // col 17 — note: NOT mirror of col 4; the rotation
  0xff, 0x7f, // col 18   convention gives different bytes for the
  0xff, 0x3f, // col 19   right half even though the displayed
  0xff, 0x1f, // col 20   shield is visually symmetric.
  0xff, 0x0f, // col 21
]);

export const SHIELD_WIDTH_PX = 22;
export const SHIELD_HEIGHT_PX = 16;
const SHIELD_BYTES_PER_ROW = Math.ceil(SHIELD_WIDTH_PX / 8); // 3

/**
 * Convert the column-major ROM bytes into the row-major packed
 * Uint8Array layout the codebase uses (3 bytes per 22-pixel row,
 * leftmost pixel = MSB of byte 0).
 */
export function shieldRomToRowMajor(): Uint8Array {
  const out = new Uint8Array(SHIELD_BYTES_PER_ROW * SHIELD_HEIGHT_PX);
  for (let col = 0; col < SHIELD_WIDTH_PX; col++) {
    const top = SHIELD_ROM_BYTES[col * 2] ?? 0;
    const bot = SHIELD_ROM_BYTES[col * 2 + 1] ?? 0;
    for (let r = 0; r < 8; r++) {
      // Bit r of `top` is row r; bit r of `bot` is row r + 8. The
      // rotation convention has bit 0 at the visual top of each
      // 8-pixel slice.
      if (top & (1 << r)) setBit(out, col, r);
      if (bot & (1 << r)) setBit(out, col, r + 8);
    }
  }
  return out;
}

function setBit(buf: Uint8Array, x: number, y: number): void {
  const byteIdx = y * SHIELD_BYTES_PER_ROW + (x >> 3);
  const bitIdx = 7 - (x & 7);
  const cur = buf[byteIdx] ?? 0;
  buf[byteIdx] = cur | (1 << bitIdx);
}

// ─────────────────────────────────────────────────────────────────
// Alien scoring + extra life + score wrap
// ─────────────────────────────────────────────────────────────────

/**
 * Alien score table from ROM $1DA0-$1DA2 (Code.html:4630-4634):
 *   1DA0: 10 ; Bottom 2 rows
 *   1DA1: 20 ; Middle row
 *   1DA2: 30 ; Highest row
 *
 * Values are stored as BCD ($10 = 10 decimal, $20 = 20, $30 = 30).
 * The "Middle row" comment is a slight simplification: in practice
 * rows 1 and 2 both score 20 points (the disassembly maps both to
 * the same table entry); rows 3 and 4 both score 10. So the row->
 * score mapping is:
 *   row 0      -> 30  (top, "highest row")
 *   rows 1, 2  -> 20  (middle, two rows)
 *   rows 3, 4  -> 10  (bottom, "bottom 2 rows")
 */
export const ALIEN_SCORE_TOP = 30;
export const ALIEN_SCORE_MIDDLE = 20;
export const ALIEN_SCORE_BOTTOM = 10;

/**
 * Extra-life threshold. The original supports DIP-switch selection
 * between 1500 (default) and 1000 (Code.html:1615-1619). We pick
 * the default 1500.
 */
export const EXTRA_LIFE_AT = 1500;

/**
 * The 1978 score is stored as 4 BCD digits (16 bits, max 9999),
 * so adding past 9999 wraps to 0. Implemented as `score % 10000`.
 */
export const SCORE_WRAP = 10_000;
