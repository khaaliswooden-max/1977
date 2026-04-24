// Tiny WebGL2 shader-compile + program-link helper.
// Returns Result so caller can handle compile/link failures via the
// degradation chain (CC8) instead of throwing in the render loop.

import { err, ok, type Result } from '@/util/result';

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): Result<WebGLShader, Error> {
  const shader = gl.createShader(type);
  if (!shader) return err(new Error('shader: createShader returned null'));
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown';
    gl.deleteShader(shader);
    return err(new Error(`shader compile failed: ${info}`));
  }
  return ok(shader);
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vert: WebGLShader,
  frag: WebGLShader,
): Result<WebGLProgram, Error> {
  const program = gl.createProgram();
  if (!program) return err(new Error('shader: createProgram returned null'));
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown';
    gl.deleteProgram(program);
    return err(new Error(`program link failed: ${info}`));
  }
  return ok(program);
}

/**
 * Convenience: compile vert + frag, link, dispose intermediate
 * shaders. Returns the linked program ready to use.
 */
export function buildProgram(
  gl: WebGL2RenderingContext,
  vertSource: string,
  fragSource: string,
): Result<WebGLProgram, Error> {
  const v = compileShader(gl, gl.VERTEX_SHADER, vertSource);
  if (v.kind === 'err') return v;
  const f = compileShader(gl, gl.FRAGMENT_SHADER, fragSource);
  if (f.kind === 'err') {
    gl.deleteShader(v.value);
    return f;
  }
  const p = linkProgram(gl, v.value, f.value);
  // Shaders are no longer needed once linked.
  gl.deleteShader(v.value);
  gl.deleteShader(f.value);
  return p;
}

/**
 * Vertex shader for a fullscreen triangle. The 3 vertices fill
 * clip-space [-1, +3] x [-1, +3], which clips to a fullscreen
 * quad. UV varying maps [0, 0] to [1, 1] for the visible region.
 * Use with `gl.drawArrays(gl.TRIANGLES, 0, 3)` and no vertex buffer.
 */
export const FULLSCREEN_TRIANGLE_VERT = /* glsl */ `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  // Pick one vertex per gl_VertexID in [0, 1, 2].
  vec2 pos = vec2(
    (gl_VertexID == 1) ? 3.0 : -1.0,
    (gl_VertexID == 2) ? 3.0 : -1.0
  );
  v_uv = (pos + 1.0) * 0.5;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;
