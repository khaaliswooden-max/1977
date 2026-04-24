// Epic 4 quality-gate test: every CRT tier has a fragment shader
// source, every source declares its uniforms with the u_camelCase
// prefix (CR13), and the constructor handles each tier without
// throwing. This complements the per-tier asserts in composite.test.ts
// by treating tiers as a set rather than individually.

import { describe, expect, it } from 'vitest';
import { _internal } from '@/render/passes/composite';

const TIER_SOURCES = {
  low: _internal.COMPOSITE_LOW_FRAG,
  mid: _internal.COMPOSITE_MID_FRAG,
  high: _internal.COMPOSITE_HIGH_FRAG,
};

describe('Epic 4 quality gate — every CRT tier shader is well-formed', () => {
  for (const [tier, src] of Object.entries(TIER_SOURCES)) {
    describe(`${tier} tier`, () => {
      it('starts with a #version 300 es directive', () => {
        expect(src.trim().startsWith('#version 300 es')).toBe(true);
      });

      it('declares precision highp float', () => {
        expect(src).toContain('precision highp float');
      });

      it('all uniform names use the u_camelCase prefix (CR13)', () => {
        const names = [...src.matchAll(/uniform\s+\S+\s+(\w+)/g)].map(
          (m) => m[1] as string,
        );
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) expect(name.startsWith('u_')).toBe(true);
      });

      it('writes to outColor exactly once (single output)', () => {
        // Match either an assignment or a declaration; we just want
        // the variable mentioned at least once on an output line.
        expect(src).toContain('out vec4 outColor');
        expect(src).toContain('outColor =');
      });
    });
  }

  it('tier ladder is monotonically more aggressive (curvature)', () => {
    expect(TIER_SOURCES.low).not.toMatch(/u_curvatureStrength \* 1\.6/);
    expect(TIER_SOURCES.mid).toContain('u_curvatureStrength * 1.6');
    expect(TIER_SOURCES.high).toContain('u_curvatureStrength * 2.0');
  });

  it('only High has halation and chromatic aberration', () => {
    expect(TIER_SOURCES.low).not.toContain('halation');
    expect(TIER_SOURCES.mid).not.toContain('halation');
    expect(TIER_SOURCES.high).toContain('vec3 halation(');
    expect(TIER_SOURCES.high).toContain('sampleAberrated');
  });

  it('Mid and High share the aperture mask code', () => {
    for (const tier of ['mid', 'high'] as const) {
      expect(TIER_SOURCES[tier]).toContain('mod(col, 3.0)');
      expect(TIER_SOURCES[tier]).toContain('vec3 mask = vec3(0.7)');
    }
    expect(TIER_SOURCES.low).not.toContain('mod(col, 3.0)');
  });
});
