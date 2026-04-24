// CRT composite pass — final blit to the main canvas with the
// tier-appropriate effects mixed in.
//
// Story 4.3 introduces the Low tier (curvature + scanline). Stories
// 4.4 / 4.5 will add Mid (+ aperture mask) and High (+ halation +
// chromatic aberration). Tier selection happens at build/program-
// creation time per ADR-003 — runtime swapping is a
// program-handle swap, not a uniform branch.

import { buildProgram, FULLSCREEN_TRIANGLE_VERT } from '@/foundation/shader';
import type { Framebuffer } from '@/foundation/framebuffer';
import {
  curvatureStrength,
  halationStrength,
  scanlineDensity,
} from '@/render/tunables';
import { isErr, ok, type Result } from '@/util/result';

export type CrtTier = 'low' | 'mid' | 'high';

// ─── Low tier: barrel curvature + scanline darkening ─────────────
//
// Curvature: Lottes-style barrel distortion. Sample uv is warped
// by `1 + strength * (uv - 0.5)^2`. Edges of the screen sample
// outside [0, 1] which we render as black — that's the rounded-
// corners look.
//
// Scanline: every other line of physical screen height gets darkened
// by a configurable factor. Scanline density is in lines per
// physical pixel; default 2.0 means the screen is divided into
// pairs of (bright, dark) rows.

const COMPOSITE_LOW_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_input;
uniform vec2 u_screenSize;
uniform float u_scanlineDensity;
uniform float u_curvatureStrength;
out vec4 outColor;

vec2 barrel(vec2 uv, float strength) {
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc) * strength;
  return uv + cc * (1.0 + dist) * dist;
}

void main() {
  vec2 uv = barrel(v_uv, u_curvatureStrength);
  // Sample outside [0, 1] -> black. Gives the rounded-corners look.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec4 c = texture(u_input, uv);

  // Scanline: dim every other physical-pixel row. The 0.85 multiplier
  // matches the Lottes default — strong enough to read but not so
  // aggressive that the image dims excessively.
  float row = uv.y * u_screenSize.y;
  float scan = mod(row, u_scanlineDensity);
  float dim = step(u_scanlineDensity * 0.5, scan);  // 0 in dark half, 1 in bright half
  float intensity = mix(0.85, 1.0, dim);

  outColor = vec4(c.rgb * intensity, 1.0);
}`;

// ─── Mid tier: Low + aperture grille mask + slightly stronger
//     curvature/scanline. The mask repeats RGB stripes across
//     physical pixels, mimicking the wire-mesh of a Trinitron-
//     style aperture grille CRT.

const COMPOSITE_MID_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_input;
uniform vec2 u_screenSize;
uniform float u_scanlineDensity;
uniform float u_curvatureStrength;
out vec4 outColor;

vec2 barrel(vec2 uv, float strength) {
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc) * strength;
  return uv + cc * (1.0 + dist) * dist;
}

void main() {
  // Mid uses ~1.6x the curvature of Low so the bow is visible.
  vec2 uv = barrel(v_uv, u_curvatureStrength * 1.6);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec4 c = texture(u_input, uv);

  // Scanline (slightly stronger 0.78 multiplier than Low's 0.85).
  float row = uv.y * u_screenSize.y;
  float scan = mod(row, u_scanlineDensity);
  float dim = step(u_scanlineDensity * 0.5, scan);
  float scanIntensity = mix(0.78, 1.0, dim);

  // Aperture grille mask: 3 pixel triplet pattern across columns,
  // each pixel weighted toward one channel. col % 3 == 0 -> red,
  // 1 -> green, 2 -> blue. Off-channels still contribute 0.7x so
  // the image doesn't lose half its brightness.
  float col = uv.x * u_screenSize.x;
  int phase = int(mod(col, 3.0));
  vec3 mask = vec3(0.7);
  if (phase == 0) mask.r = 1.0;
  else if (phase == 1) mask.g = 1.0;
  else mask.b = 1.0;

  outColor = vec4(c.rgb * mask * scanIntensity, 1.0);
}`;

// ─── High tier: Mid + halation (bright-bloom) + chromatic
//     aberration (edge color fringing) + subpixel sample dither.
//
// Halation: bright pixels bleed light into neighboring pixels. We
// approximate with a 9-tap box blur of bright-only pixels added on
// top of the base color.
// Chromatic aberration: sample R/G/B at slightly offset UVs so
// edges show subtle color fringing — strongest near the corners
// of the screen, like real glass-front CRTs.

const COMPOSITE_HIGH_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_input;
uniform vec2 u_screenSize;
uniform float u_scanlineDensity;
uniform float u_curvatureStrength;
uniform float u_halationStrength;
out vec4 outColor;

vec2 barrel(vec2 uv, float strength) {
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc) * strength;
  return uv + cc * (1.0 + dist) * dist;
}

vec3 sampleAberrated(sampler2D tex, vec2 uv) {
  // CA scales with distance from center (like real CRT glass).
  vec2 cc = uv - 0.5;
  float r = length(cc);
  vec2 dir = (r > 0.0) ? cc / r : vec2(0.0);
  vec2 caOffset = dir * 0.0015 * r;
  float r_ = texture(tex, uv + caOffset).r;
  float g_ = texture(tex, uv).g;
  float b_ = texture(tex, uv - caOffset).b;
  return vec3(r_, g_, b_);
}

vec3 halation(sampler2D tex, vec2 uv, vec2 texel, float strength) {
  // 9-tap box on the BRIGHT channel only (above 0.5 luminance).
  vec3 sum = vec3(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec3 s = texture(tex, uv + vec2(float(dx), float(dy)) * texel).rgb;
      float lum = dot(s, vec3(0.299, 0.587, 0.114));
      if (lum > 0.5) sum += s;
    }
  }
  return sum * (strength / 9.0);
}

void main() {
  // High uses ~2x the curvature of Low.
  vec2 uv = barrel(v_uv, u_curvatureStrength * 2.0);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 base = sampleAberrated(u_input, uv);

  // Halation: sampled in source-texture pixel units.
  vec2 inputSize = vec2(textureSize(u_input, 0));
  vec2 texel = 1.0 / inputSize;
  vec3 glow = halation(u_input, uv, texel, u_halationStrength);

  // Scanline (slightly stronger 0.75 multiplier than Mid's 0.78).
  float row = uv.y * u_screenSize.y;
  float scan = mod(row, u_scanlineDensity);
  float dim = step(u_scanlineDensity * 0.5, scan);
  float scanIntensity = mix(0.75, 1.0, dim);

  // Aperture grille mask (same as Mid).
  float col = uv.x * u_screenSize.x;
  int phase = int(mod(col, 3.0));
  vec3 mask = vec3(0.7);
  if (phase == 0) mask.r = 1.0;
  else if (phase == 1) mask.g = 1.0;
  else mask.b = 1.0;

  vec3 color = base * mask * scanIntensity + glow;
  outColor = vec4(color, 1.0);
}`;

const COMPOSITE_PASSTHROUGH_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_input;
out vec4 outColor;
void main() {
  outColor = texture(u_input, v_uv);
}`;

export interface CompositePass {
  /** Draw the input framebuffer to the currently-bound framebuffer
   *  (typically the default = main canvas). */
  draw(input: Framebuffer, viewportW: number, viewportH: number): void;
  /** Which tier this pass instance was built for. */
  readonly tier: CrtTier;
  dispose(): void;
}

export function createCompositePass(
  gl: WebGL2RenderingContext,
  tier: CrtTier = 'low',
): Result<CompositePass, Error> {
  const fragSource = pickFragSource(tier);
  const program = buildProgram(gl, FULLSCREEN_TRIANGLE_VERT, fragSource);
  if (isErr(program)) return program;

  const uInput = gl.getUniformLocation(program.value, 'u_input');
  const uScreenSize = gl.getUniformLocation(program.value, 'u_screenSize');
  const uScanlineDensity = gl.getUniformLocation(
    program.value,
    'u_scanlineDensity',
  );
  const uCurvatureStrength = gl.getUniformLocation(
    program.value,
    'u_curvatureStrength',
  );
  const uHalationStrength = gl.getUniformLocation(
    program.value,
    'u_halationStrength',
  );

  return ok({
    tier,
    draw(input, viewportW, viewportH) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, viewportW, viewportH);
      gl.useProgram(program.value);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, input.texture);
      gl.uniform1i(uInput, 0);
      if (uScreenSize) gl.uniform2f(uScreenSize, viewportW, viewportH);
      if (uScanlineDensity)
        gl.uniform1f(uScanlineDensity, scanlineDensity.value);
      if (uCurvatureStrength)
        gl.uniform1f(uCurvatureStrength, curvatureStrength.value);
      if (uHalationStrength)
        gl.uniform1f(uHalationStrength, halationStrength.value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteProgram(program.value);
    },
  });
}

function pickFragSource(tier: CrtTier): string {
  switch (tier) {
    case 'low':
      return COMPOSITE_LOW_FRAG;
    case 'mid':
      return COMPOSITE_MID_FRAG;
    case 'high':
      return COMPOSITE_HIGH_FRAG;
    default:
      return COMPOSITE_PASSTHROUGH_FRAG;
  }
}

export const _internal = {
  COMPOSITE_LOW_FRAG,
  COMPOSITE_MID_FRAG,
  COMPOSITE_HIGH_FRAG,
  COMPOSITE_PASSTHROUGH_FRAG,
};
