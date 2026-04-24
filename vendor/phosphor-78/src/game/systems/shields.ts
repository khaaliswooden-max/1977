// FR12: shields with pixel-level erosion.
//
// CONSTANTS POLICY (NFR21 / CR12 / Story 2.6):
// The 22x16 shield bitmap is 1:1 with ROM $1D20 (see
// @/constants/computer-archeology). Placement constants here
// (SHIELD_Y, the 4 bunker x-positions) are visual approximations.
//
// Shield bitmap is a 22x16 grid of bits packed as bytes, one bit
// per pixel, row-major. Bullets clear bits where they hit; the
// bullet is consumed in the same tick.

import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type {
  Bullet,
  GameState,
  Invader,
  InvaderBullet,
  Shield,
} from '@/types/game';

// Hardcoded here (rather than imported from collisions.ts) to keep
// shields self-contained and avoid a sub-reducer ↔ sub-reducer
// import. Same dimensions as collisions.ts uses.
const INVADER_BODY_W = 12;
const INVADER_BODY_H = 8;

export const SHIELD_WIDTH = 22;
export const SHIELD_HEIGHT = 16;
export const SHIELD_COUNT = 4; // The original arcade has 4 bunkers.
export const SHIELD_Y = 192;
const SHIELD_BYTES_PER_ROW = Math.ceil(SHIELD_WIDTH / 8); // 3 bytes
const SHIELD_TOTAL_BYTES = SHIELD_BYTES_PER_ROW * SHIELD_HEIGHT;

/** Pack a row-major boolean grid into the bitmap byte format. */
function packBitmap(rows: readonly (readonly boolean[])[]): Uint8Array {
  const out = new Uint8Array(SHIELD_TOTAL_BYTES);
  for (let y = 0; y < SHIELD_HEIGHT; y++) {
    const row = rows[y];
    if (!row) continue;
    for (let x = 0; x < SHIELD_WIDTH; x++) {
      if (!row[x]) continue;
      const byteIdx = y * SHIELD_BYTES_PER_ROW + (x >> 3);
      const bitIdx = 7 - (x & 7);
      const cur = out[byteIdx] ?? 0;
      out[byteIdx] = cur | (1 << bitIdx);
    }
  }
  return out;
}

/** Placeholder shield silhouette: flat-topped arch with notch. */
export function makePlaceholderShieldBitmap(): Uint8Array {
  const rows: boolean[][] = [];
  for (let y = 0; y < SHIELD_HEIGHT; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < SHIELD_WIDTH; x++) {
      // Top half: solid rectangle with rounded corners.
      // Bottom half: notch in the center.
      if (y < 12) {
        const inCorner =
          (y < 2 && (x < 2 || x >= SHIELD_WIDTH - 2)) ||
          (y < 1 && (x < 4 || x >= SHIELD_WIDTH - 4));
        row.push(!inCorner);
      } else {
        const notchHalf = 4;
        const inNotch =
          x >= SHIELD_WIDTH / 2 - notchHalf &&
          x < SHIELD_WIDTH / 2 + notchHalf &&
          y >= 12;
        row.push(!inNotch);
      }
    }
    rows.push(row);
  }
  return packBitmap(rows);
}

// Story 2.4: real bitmap from ROM $1D20. The placeholder above
// stays exported because tests for the placeholder still cover
// useful invariants (notch, rounded top); the new makeInitialShields
// uses the disassembly-derived bitmap.
import { shieldRomToRowMajor } from '@/constants/computer-archeology';
const ROM_BITMAP = shieldRomToRowMajor();

export function makeInitialShields(): readonly Shield[] {
  // Story 5.15: bunker LEFT-edges at 32, 80, 128, 176 — matches
  // the original ROM layout (right edge of rightmost shield = 198,
  // leaving room for the player ship to fully clear it horizontally).
  // Old centers (32, 88, 144, 200) put the rightmost shield's right
  // edge at 211 — the ship's right half could only just barely
  // poke past it.
  const lefts = [32, 80, 128, 176];
  return lefts.slice(0, SHIELD_COUNT).map((lx) => ({
    origin: { x: lx, y: SHIELD_Y },
    bitmap: new Uint8Array(ROM_BITMAP),
  }));
}

export function isPixelSet(bitmap: Uint8Array, x: number, y: number): boolean {
  if (x < 0 || x >= SHIELD_WIDTH || y < 0 || y >= SHIELD_HEIGHT) return false;
  const byteIdx = y * SHIELD_BYTES_PER_ROW + (x >> 3);
  const bitIdx = 7 - (x & 7);
  const byte = bitmap[byteIdx] ?? 0;
  return (byte & (1 << bitIdx)) !== 0;
}

export function clearPixel(bitmap: Uint8Array, x: number, y: number): void {
  if (x < 0 || x >= SHIELD_WIDTH || y < 0 || y >= SHIELD_HEIGHT) return;
  const byteIdx = y * SHIELD_BYTES_PER_ROW + (x >> 3);
  const bitIdx = 7 - (x & 7);
  const byte = bitmap[byteIdx] ?? 0;
  bitmap[byteIdx] = byte & ~(1 << bitIdx);
}

interface BulletHitResult {
  hit: boolean;
  shieldIndex: number;
}

/**
 * Test whether a bullet (point) is inside any shield's bitmap pixel.
 * If so, clear a small bullet-shaped chunk around the impact (the
 * original game's bullet sprite carves a similar bite). Returns
 * hit/shieldIndex; bullet consumption is the caller's responsibility.
 *
 * Story 5.10: erosion was bumped from a flat 2x2 to a 3-wide x 4-tall
 * chunk with the corners knocked off so damage is visible at the
 * 224x256 logical resolution after the CRT scan-line shader softens
 * fine detail.
 *
 * NOTE: this mutates the matched shield's bitmap. The caller is
 * expected to have already cloned the shields array (this is the
 * sub-reducer; it owns the new state's shields).
 */
const EROSION_OFFSETS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-1, 0], [0, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
  [-1, 2], [0, 2], [1, 2],
  [0, 3],
];

function tryBulletHit(
  shields: readonly Shield[],
  bx: number,
  by: number,
): BulletHitResult {
  for (let i = 0; i < shields.length; i++) {
    const sh = shields[i];
    if (!sh) continue;
    const lx = bx - sh.origin.x;
    const ly = by - sh.origin.y;
    if (isPixelSet(sh.bitmap, lx, ly)) {
      for (const [dx, dy] of EROSION_OFFSETS) {
        clearPixel(sh.bitmap, lx + dx, ly + dy);
      }
      return { hit: true, shieldIndex: i };
    }
  }
  return { hit: false, shieldIndex: -1 };
}

/**
 * Story 5.11: when a live invader's body overlaps a shield, the
 * shield pixels under the invader are eaten away. Original-game
 * behavior — invaders carve a trail through shields as they
 * descend, and the shield disappears piece by piece rather than
 * winking out the moment an invader touches it.
 *
 * Mutates the shields array's bitmaps. Returns true if any pixel
 * was cleared.
 */
function eatShieldsByInvaders(
  shields: readonly Shield[],
  invaders: readonly Invader[],
): boolean {
  let dirty = false;
  for (const inv of invaders) {
    if (!inv.alive) continue;
    for (const sh of shields) {
      const xMin = Math.max(inv.pos.x, sh.origin.x);
      const xMax = Math.min(
        inv.pos.x + INVADER_BODY_W,
        sh.origin.x + SHIELD_WIDTH,
      );
      const yMin = Math.max(inv.pos.y, sh.origin.y);
      const yMax = Math.min(
        inv.pos.y + INVADER_BODY_H,
        sh.origin.y + SHIELD_HEIGHT,
      );
      if (xMin >= xMax || yMin >= yMax) continue;
      for (let y = yMin; y < yMax; y++) {
        for (let x = xMin; x < xMax; x++) {
          const lx = x - sh.origin.x;
          const ly = y - sh.origin.y;
          if (isPixelSet(sh.bitmap, lx, ly)) {
            clearPixel(sh.bitmap, lx, ly);
            dirty = true;
          }
        }
      }
    }
  }
  return dirty;
}

export function tickShields(
  state: GameState,
  _input: unknown,
  _clock: Clock,
  _events: GameEvent[],
): GameState {
  if (state.shields.length === 0) return state;

  // Clone shield bitmaps lazily — only when something is about to be
  // mutated. To keep the code simple and correct, eagerly clone here.
  let dirty = false;
  const shields: Shield[] = state.shields.map((sh) => ({
    origin: sh.origin,
    bitmap: new Uint8Array(sh.bitmap),
  }));

  let playerBullet: Bullet | null = state.playerBullet;
  if (playerBullet) {
    const r = tryBulletHit(shields, playerBullet.pos.x, playerBullet.pos.y);
    if (r.hit) {
      playerBullet = null;
      dirty = true;
    }
  }

  const survivingInvaderBullets: InvaderBullet[] = [];
  for (const ib of state.invaderBullets) {
    const r = tryBulletHit(shields, ib.pos.x, ib.pos.y);
    if (r.hit) {
      dirty = true;
      // bullet consumed
    } else {
      survivingInvaderBullets.push(ib);
    }
  }

  if (eatShieldsByInvaders(shields, state.invaders)) {
    dirty = true;
  }

  if (!dirty) return state;
  return {
    ...state,
    shields,
    playerBullet,
    invaderBullets: survivingInvaderBullets,
  };
}
