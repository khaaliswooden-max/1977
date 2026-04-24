import { describe, expect, it } from 'vitest';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/util/coords';
import { computePixelLayout } from '@/foundation/pixel-pipeline';

describe('computePixelLayout', () => {
  it('1080p non-Retina (dpr=1): scale 4 fits 224x256', () => {
    const layout = computePixelLayout({
      cssWidth: 1920,
      cssHeight: 1080,
      devicePixelRatio: 1,
    });
    // 1080 / 256 = 4.21 -> floor 4
    // 1920 / 224 = 8.57 -> floor 8
    // min = 4
    expect(layout.scale).toBe(4);
    expect(layout.canvasWidth).toBe(LOGICAL_WIDTH * 4);
    expect(layout.canvasHeight).toBe(LOGICAL_HEIGHT * 4);
    expect(layout.cssWidth).toBe(LOGICAL_WIDTH * 4);
    expect(layout.cssHeight).toBe(LOGICAL_HEIGHT * 4);
  });

  it('1080p Retina (dpr=2): scale 8 (works in physical pixels)', () => {
    const layout = computePixelLayout({
      cssWidth: 1920,
      cssHeight: 1080,
      devicePixelRatio: 2,
    });
    // physical 3840x2160 -> 2160/256 = 8.43 -> 8; 3840/224 = 17.14 -> 17; min 8
    expect(layout.scale).toBe(8);
    expect(layout.canvasWidth).toBe(LOGICAL_WIDTH * 8);
    expect(layout.canvasHeight).toBe(LOGICAL_HEIGHT * 8);
    // CSS box is half the backing buffer at dpr=2.
    expect(layout.cssWidth).toBe((LOGICAL_WIDTH * 8) / 2);
    expect(layout.cssHeight).toBe((LOGICAL_HEIGHT * 8) / 2);
  });

  it('720p non-Retina: scale 2 (height-bound)', () => {
    const layout = computePixelLayout({
      cssWidth: 1280,
      cssHeight: 720,
      devicePixelRatio: 1,
    });
    // 720/256 = 2.81 -> 2; 1280/224 = 5.71 -> 5; min 2
    expect(layout.scale).toBe(2);
  });

  it('4K non-Retina: scale 8', () => {
    const layout = computePixelLayout({
      cssWidth: 3840,
      cssHeight: 2160,
      devicePixelRatio: 1,
    });
    expect(layout.scale).toBe(8);
  });

  it('tiny viewport falls back to scale 1, never 0', () => {
    const layout = computePixelLayout({
      cssWidth: 100,
      cssHeight: 100,
      devicePixelRatio: 1,
    });
    expect(layout.scale).toBe(1);
    expect(layout.canvasWidth).toBe(LOGICAL_WIDTH);
    expect(layout.canvasHeight).toBe(LOGICAL_HEIGHT);
  });

  it('phone-portrait (375x667 @ dpr=3) bounds by width', () => {
    const layout = computePixelLayout({
      cssWidth: 375,
      cssHeight: 667,
      devicePixelRatio: 3,
    });
    // physical 1125 x 2001 -> 1125/224 = 5.02 -> 5; 2001/256 = 7.81 -> 7; min 5
    expect(layout.scale).toBe(5);
  });

  it('canvas dimensions are always integer multiples of logical dims', () => {
    const cases = [
      { cssWidth: 1920, cssHeight: 1080, devicePixelRatio: 1 },
      { cssWidth: 1280, cssHeight: 720, devicePixelRatio: 2 },
      { cssWidth: 800, cssHeight: 600, devicePixelRatio: 1.5 },
      { cssWidth: 2560, cssHeight: 1440, devicePixelRatio: 2 },
    ];
    for (const c of cases) {
      const l = computePixelLayout(c);
      expect(l.canvasWidth % LOGICAL_WIDTH).toBe(0);
      expect(l.canvasHeight % LOGICAL_HEIGHT).toBe(0);
      expect(Number.isInteger(l.scale)).toBe(true);
    }
  });
});
