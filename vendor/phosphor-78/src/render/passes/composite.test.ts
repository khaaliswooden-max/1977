// Pure structural tests for the composite shader sources. We can't
// fully exercise GLSL compilation in node, but we can pin down the
// shader-source content invariants and verify createCompositePass's
// program-creation contract via a mock GL.

import { describe, expect, it } from 'vitest';
import { _internal, createCompositePass } from '@/render/passes/composite';

describe('COMPOSITE_LOW_FRAG', () => {
  it('declares the expected uniforms', () => {
    const src = _internal.COMPOSITE_LOW_FRAG;
    expect(src).toContain('uniform sampler2D u_input');
    expect(src).toContain('uniform vec2 u_screenSize');
    expect(src).toContain('uniform float u_scanlineDensity');
    expect(src).toContain('uniform float u_curvatureStrength');
  });

  it('uses the u_camelCase prefix per CR13', () => {
    const src = _internal.COMPOSITE_LOW_FRAG;
    const uniformNames = [...src.matchAll(/uniform\s+\S+\s+(\w+)/g)].map(
      (m) => m[1] as string,
    );
    for (const name of uniformNames) {
      expect(name.startsWith('u_')).toBe(true);
    }
  });

  it('implements barrel curvature (Lottes-style)', () => {
    expect(_internal.COMPOSITE_LOW_FRAG).toContain('barrel');
    expect(_internal.COMPOSITE_LOW_FRAG).toMatch(/cc \* \(1\.0 \+ dist\)/);
  });

  it('clips outside [0, 1] uv to black (rounded corners)', () => {
    expect(_internal.COMPOSITE_LOW_FRAG).toContain('uv.x < 0.0');
    expect(_internal.COMPOSITE_LOW_FRAG).toContain('uv.x > 1.0');
  });

  it('applies scanline darkening', () => {
    expect(_internal.COMPOSITE_LOW_FRAG).toContain('mod(row, u_scanlineDensity)');
    expect(_internal.COMPOSITE_LOW_FRAG).toContain('mix(0.85, 1.0');
  });
});

describe('COMPOSITE_MID_FRAG', () => {
  it('extends Low with an aperture grille mask', () => {
    const src = _internal.COMPOSITE_MID_FRAG;
    expect(src).toContain('mod(col, 3.0)');
    expect(src).toContain('mask.r = 1.0');
    expect(src).toContain('mask.g = 1.0');
    expect(src).toContain('mask.b = 1.0');
  });

  it('uses stronger scanline darkening than Low (0.78 vs 0.85)', () => {
    expect(_internal.COMPOSITE_MID_FRAG).toContain('mix(0.78, 1.0');
  });

  it('uses ~1.6x curvature strength of Low', () => {
    expect(_internal.COMPOSITE_MID_FRAG).toContain('u_curvatureStrength * 1.6');
  });

  it('keeps off-channels at 0.7 (mask does not halve brightness)', () => {
    expect(_internal.COMPOSITE_MID_FRAG).toContain('vec3 mask = vec3(0.7)');
  });
});

describe('COMPOSITE_HIGH_FRAG', () => {
  it('declares all High-tier uniforms (incl halation)', () => {
    const src = _internal.COMPOSITE_HIGH_FRAG;
    expect(src).toContain('uniform sampler2D u_input');
    expect(src).toContain('uniform vec2 u_screenSize');
    expect(src).toContain('uniform float u_scanlineDensity');
    expect(src).toContain('uniform float u_curvatureStrength');
    expect(src).toContain('uniform float u_halationStrength');
  });

  it('all uniforms use u_camelCase prefix per CR13', () => {
    const src = _internal.COMPOSITE_HIGH_FRAG;
    const uniformNames = [...src.matchAll(/uniform\s+\S+\s+(\w+)/g)].map(
      (m) => m[1] as string,
    );
    for (const name of uniformNames) expect(name.startsWith('u_')).toBe(true);
  });

  it('implements halation (9-tap box on bright pixels)', () => {
    const src = _internal.COMPOSITE_HIGH_FRAG;
    expect(src).toContain('vec3 halation(');
    expect(src).toContain('lum > 0.5');
  });

  it('implements chromatic aberration (R/G/B sampled at offset UVs)', () => {
    const src = _internal.COMPOSITE_HIGH_FRAG;
    expect(src).toContain('sampleAberrated');
    expect(src).toContain('uv + caOffset');
    expect(src).toContain('uv - caOffset');
  });

  it('uses 2x curvature of Low (strongest of the three tiers)', () => {
    expect(_internal.COMPOSITE_HIGH_FRAG).toContain('u_curvatureStrength * 2.0');
  });

  it('uses strongest scanline darkening (0.75)', () => {
    expect(_internal.COMPOSITE_HIGH_FRAG).toContain('mix(0.75, 1.0');
  });

  it('keeps the same RGB mask as Mid', () => {
    expect(_internal.COMPOSITE_HIGH_FRAG).toContain('mask.r = 1.0');
    expect(_internal.COMPOSITE_HIGH_FRAG).toContain('mask.g = 1.0');
    expect(_internal.COMPOSITE_HIGH_FRAG).toContain('mask.b = 1.0');
  });
});

describe('createCompositePass', () => {
  // Minimal GL mock — just enough surface area for the constructor
  // path to succeed. We're checking the contract, not the GLSL.
  function makeMockGL(opts: { compileOk?: boolean } = {}): WebGL2RenderingContext {
    const compileOk = opts.compileOk ?? true;
    const calls: string[] = [];
    return {
      VERTEX_SHADER: 1,
      FRAGMENT_SHADER: 2,
      COMPILE_STATUS: 3,
      LINK_STATUS: 4,
      FRAMEBUFFER: 5,
      TEXTURE_2D: 6,
      TEXTURE0: 7,
      TRIANGLES: 8,
      createShader: () => ({} as WebGLShader),
      shaderSource: () => calls.push('shaderSource'),
      compileShader: () => calls.push('compileShader'),
      getShaderParameter: () => compileOk,
      getShaderInfoLog: () => '',
      deleteShader: () => calls.push('deleteShader'),
      createProgram: () => ({} as WebGLProgram),
      attachShader: () => calls.push('attachShader'),
      linkProgram: () => calls.push('linkProgram'),
      getProgramParameter: () => compileOk,
      getProgramInfoLog: () => '',
      deleteProgram: () => calls.push('deleteProgram'),
      getUniformLocation: (_p: WebGLProgram, name: string) =>
        ({ name } as unknown as WebGLUniformLocation),
      bindFramebuffer: () => calls.push('bindFramebuffer'),
      viewport: () => calls.push('viewport'),
      useProgram: () => calls.push('useProgram'),
      activeTexture: () => calls.push('activeTexture'),
      bindTexture: () => calls.push('bindTexture'),
      uniform1i: () => calls.push('uniform1i'),
      uniform1f: () => calls.push('uniform1f'),
      uniform2f: () => calls.push('uniform2f'),
      drawArrays: () => calls.push('drawArrays'),
    } as unknown as WebGL2RenderingContext;
  }

  it('builds a Low tier pass by default', () => {
    const gl = makeMockGL();
    const r = createCompositePass(gl);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.value.tier).toBe('low');
  });

  it('supports explicit Low / Mid / High tier selection', () => {
    const gl = makeMockGL();
    for (const tier of ['low', 'mid', 'high'] as const) {
      const r = createCompositePass(gl, tier);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') expect(r.value.tier).toBe(tier);
    }
  });

  it('returns err when shader compile fails', () => {
    const gl = makeMockGL({ compileOk: false });
    const r = createCompositePass(gl);
    expect(r.kind).toBe('err');
  });
});
