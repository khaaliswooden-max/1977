import { describe, expect, it } from 'vitest';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, worldToNDC } from '@/util/coords';

describe('worldToNDC', () => {
  it('top-left pixel maps to (-1, +1)', () => {
    expect(worldToNDC({ x: 0, y: 0 })).toEqual({ x: -1, y: 1 });
  });

  it('top-right pixel maps to (+1, +1)', () => {
    expect(worldToNDC({ x: LOGICAL_WIDTH, y: 0 })).toEqual({ x: 1, y: 1 });
  });

  it('bottom-left pixel maps to (-1, -1)', () => {
    expect(worldToNDC({ x: 0, y: LOGICAL_HEIGHT })).toEqual({ x: -1, y: -1 });
  });

  it('bottom-right pixel maps to (+1, -1)', () => {
    expect(worldToNDC({ x: LOGICAL_WIDTH, y: LOGICAL_HEIGHT })).toEqual({
      x: 1,
      y: -1,
    });
  });

  it('center pixel maps to (0, 0)', () => {
    const r = worldToNDC({ x: LOGICAL_WIDTH / 2, y: LOGICAL_HEIGHT / 2 });
    expect(r.x).toBeCloseTo(0);
    expect(r.y).toBeCloseTo(0);
  });

  it('handles pixels outside the framebuffer (no clamping)', () => {
    const before = worldToNDC({ x: -1, y: -1 });
    expect(before.x).toBeLessThan(-1);
    expect(before.y).toBeGreaterThan(1);
    const after = worldToNDC({
      x: LOGICAL_WIDTH + 1,
      y: LOGICAL_HEIGHT + 1,
    });
    expect(after.x).toBeGreaterThan(1);
    expect(after.y).toBeLessThan(-1);
  });

  it('logical dimensions match 1978 framebuffer (224x256)', () => {
    expect(LOGICAL_WIDTH).toBe(224);
    expect(LOGICAL_HEIGHT).toBe(256);
  });
});
