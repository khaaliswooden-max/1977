import { describe, expect, it } from 'vitest';
import {
  SHIELD_COUNT,
  SHIELD_HEIGHT,
  SHIELD_WIDTH,
  clearPixel,
  isPixelSet,
  makeInitialShields,
  makePlaceholderShieldBitmap,
  tickShields,
} from '@/game/systems/shields';
import { initialState } from '@/game/state';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

describe('shield bitmap', () => {
  it('placeholder bitmap has the top row mostly filled', () => {
    const bm = makePlaceholderShieldBitmap();
    let on = 0;
    for (let x = 0; x < SHIELD_WIDTH; x++) {
      if (isPixelSet(bm, x, 1)) on++;
    }
    // The placeholder rounds the top corners but keeps the middle
    // filled, so ~16-22 pixels should be set on row 1.
    expect(on).toBeGreaterThan(SHIELD_WIDTH - 6);
  });

  it('bottom row has the notch in the middle', () => {
    const bm = makePlaceholderShieldBitmap();
    expect(isPixelSet(bm, SHIELD_WIDTH / 2, SHIELD_HEIGHT - 1)).toBe(false);
    expect(isPixelSet(bm, 0, SHIELD_HEIGHT - 1)).toBe(true);
  });

  it('clearPixel turns a set bit off', () => {
    const bm = makePlaceholderShieldBitmap();
    expect(isPixelSet(bm, 5, 5)).toBe(true);
    clearPixel(bm, 5, 5);
    expect(isPixelSet(bm, 5, 5)).toBe(false);
  });

  it('out-of-bounds pixels are reported off and clear is a no-op', () => {
    const bm = makePlaceholderShieldBitmap();
    expect(isPixelSet(bm, -1, 0)).toBe(false);
    expect(isPixelSet(bm, SHIELD_WIDTH, 0)).toBe(false);
    expect(isPixelSet(bm, 0, SHIELD_HEIGHT)).toBe(false);
    expect(() => clearPixel(bm, -1, -1)).not.toThrow();
  });
});

describe('makeInitialShields', () => {
  it(`creates ${SHIELD_COUNT} shields`, () => {
    expect(makeInitialShields()).toHaveLength(SHIELD_COUNT);
  });

  it('shield bitmaps are independent copies', () => {
    const shields = makeInitialShields();
    const a = shields[0]?.bitmap;
    const b = shields[1]?.bitmap;
    expect(a).not.toBe(b);
    if (a) clearPixel(a, 5, 5);
    if (b) expect(isPixelSet(b, 5, 5)).toBe(true);
  });
});

describe('tickShields', () => {
  it('passes state through when no shields exist', () => {
    const s = initialState();
    expect(tickShields(s, NEUTRAL_INPUT, clock, [])).toBe(s);
  });

  it('player bullet hitting a shield clears pixels and consumes the bullet', () => {
    const shields = makeInitialShields();
    const target = shields[0];
    if (!target) throw new Error('no shield 0');
    const s = {
      ...initialState(),
      shields,
      playerBullet: {
        id: 'p',
        pos: { x: target.origin.x + 5, y: target.origin.y + 5 },
        velocity: { x: 0, y: -4 },
      },
    };
    const r = tickShields(s, NEUTRAL_INPUT, clock, []);
    expect(r.playerBullet).toBeNull();
    expect(isPixelSet(r.shields[0]!.bitmap, 5, 5)).toBe(false);
    // Original input unchanged.
    expect(isPixelSet(target.bitmap, 5, 5)).toBe(true);
  });

  it('invader bullet hitting a shield is removed', () => {
    const shields = makeInitialShields();
    const target = shields[1];
    if (!target) throw new Error('no shield 1');
    const s = {
      ...initialState(),
      shields,
      invaderBullets: [
        {
          id: 'ib',
          pos: { x: target.origin.x + 10, y: target.origin.y + 5 },
          velocity: { x: 0, y: 2 },
          kind: 'rolling' as const,
          animationFrame: 0,
        },
      ],
    };
    const r = tickShields(s, NEUTRAL_INPUT, clock, []);
    expect(r.invaderBullets).toHaveLength(0);
  });

  it('bullet missing all shields leaves state unchanged', () => {
    const shields = makeInitialShields();
    const s = {
      ...initialState(),
      shields,
      playerBullet: {
        id: 'p',
        pos: { x: 0, y: 0 }, // nowhere near any shield
        velocity: { x: 0, y: -4 },
      },
    };
    const r = tickShields(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  // Story 5.11: aliens carve a trail through shields rather than
  // passing through invisibly. When an alive invader's body
  // overlaps a shield's bounding region, all shield pixels under
  // that overlap are cleared.
  it('alive invader overlapping a shield eats the overlapped pixels', () => {
    const shields = makeInitialShields();
    const target = shields[0];
    if (!target) throw new Error('no shield 0');
    // Place an invader so its top-left aligns with the shield's
    // top-left. The invader body is 12x8.
    const s = {
      ...initialState(),
      shields,
      invaders: [
        {
          id: 'inv',
          row: 4,
          col: 0,
          pos: { x: target.origin.x, y: target.origin.y },
          kind: 'bottom' as const,
          alive: true,
        },
      ],
    };
    const r = tickShields(s, NEUTRAL_INPUT, clock, []);
    // At least some shield pixels under the invader were set
    // before; they must be cleared after.
    const before = target.bitmap; // original (untouched)
    const after = r.shields[0]!.bitmap;
    let beforeOn = 0;
    let afterOn = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 12; x++) {
        if (isPixelSet(before, x, y)) beforeOn++;
        if (isPixelSet(after, x, y)) afterOn++;
      }
    }
    expect(beforeOn).toBeGreaterThan(0);
    expect(afterOn).toBe(0);
  });

  it('dead invader does NOT eat shields', () => {
    const shields = makeInitialShields();
    const target = shields[0];
    if (!target) throw new Error('no shield 0');
    const s = {
      ...initialState(),
      shields,
      invaders: [
        {
          id: 'inv',
          row: 4,
          col: 0,
          pos: { x: target.origin.x, y: target.origin.y },
          kind: 'bottom' as const,
          alive: false,
        },
      ],
    };
    const r = tickShields(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });

  it('invader far above the shields does not eat anything', () => {
    const shields = makeInitialShields();
    const target = shields[0];
    if (!target) throw new Error('no shield 0');
    const s = {
      ...initialState(),
      shields,
      invaders: [
        {
          id: 'inv',
          row: 0,
          col: 0,
          pos: { x: target.origin.x, y: 50 }, // way above
          kind: 'top' as const,
          alive: true,
        },
      ],
    };
    const r = tickShields(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });
});
