// AR7: WebGL2 context creation with RGBA16F probe and fallbacks.
// CC1: returns Result; throws are reserved for invariant violations.

import { err, ok, type Result } from '@/util/result';

export type ColorFormat = 'RGBA16F' | 'RGBA8';

export interface WebGL2Bundle {
  readonly gl: WebGL2RenderingContext;
  readonly colorFormat: ColorFormat;
}

export interface ContextOptions {
  /** Prefer the highest-precision color format the GPU can handle. */
  readonly preferHighPrecision?: boolean;
  /** Override defaults for getContext (e.g. antialias). */
  readonly contextAttributes?: WebGLContextAttributes;
}

const DEFAULT_ATTRS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  premultipliedAlpha: true,
  powerPreference: 'high-performance',
};

export function createWebGL2Context(
  canvas: HTMLCanvasElement,
  opts: ContextOptions = {},
): Result<WebGL2Bundle, Error> {
  const attrs = { ...DEFAULT_ATTRS, ...opts.contextAttributes };
  const gl = canvas.getContext('webgl2', attrs);
  if (!gl) {
    return err(new Error('WebGL2 not supported by this browser/GPU'));
  }

  const wantHigh = opts.preferHighPrecision !== false;
  const supportsFloat = wantHigh && hasColorBufferFloat(gl);
  const colorFormat: ColorFormat = supportsFloat ? 'RGBA16F' : 'RGBA8';

  return ok({ gl, colorFormat });
}

/**
 * RGBA16F as a render-target requires EXT_color_buffer_float (or
 * EXT_color_buffer_half_float). Sampling RGBA16F textures works
 * unconditionally in WebGL2 but rendering INTO them needs the ext.
 * The phosphor-persistence pass needs render-to-RGBA16F to avoid
 * 8-bit accumulation banding (ADR-003).
 */
export function hasColorBufferFloat(gl: WebGL2RenderingContext): boolean {
  return (
    gl.getExtension('EXT_color_buffer_float') !== null ||
    gl.getExtension('EXT_color_buffer_half_float') !== null
  );
}
