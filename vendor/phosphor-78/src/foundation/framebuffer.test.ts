import { describe, expect, it } from 'vitest';
import { createFramebuffer } from '@/foundation/framebuffer';
import { isErr, isOk } from '@/util/result';

interface MockGL {
  RGBA: number;
  RGBA16F: number;
  RGBA8: number;
  HALF_FLOAT: number;
  UNSIGNED_BYTE: number;
  TEXTURE_2D: number;
  TEXTURE_MIN_FILTER: number;
  TEXTURE_MAG_FILTER: number;
  TEXTURE_WRAP_S: number;
  TEXTURE_WRAP_T: number;
  CLAMP_TO_EDGE: number;
  NEAREST: number;
  LINEAR: number;
  FRAMEBUFFER: number;
  COLOR_ATTACHMENT0: number;
  FRAMEBUFFER_COMPLETE: number;
  createTexture: () => WebGLTexture | null;
  createFramebuffer: () => WebGLFramebuffer | null;
  bindTexture: (...args: unknown[]) => void;
  texImage2D: (...args: unknown[]) => void;
  texParameteri: (...args: unknown[]) => void;
  bindFramebuffer: (...args: unknown[]) => void;
  framebufferTexture2D: (...args: unknown[]) => void;
  checkFramebufferStatus: () => number;
  deleteTexture: (...args: unknown[]) => void;
  deleteFramebuffer: (...args: unknown[]) => void;
  viewport: (...args: unknown[]) => void;
  getExtension: (name: string) => unknown;
  // Track method calls for assertions
  _calls: Record<string, unknown[][]>;
}

function makeMockGL(opts: {
  hasFloatExt?: boolean;
  framebufferComplete?: boolean;
} = {}): MockGL {
  const calls: Record<string, unknown[][]> = {};
  const track = (name: string, args: unknown[]) => {
    (calls[name] ??= []).push(args);
  };
  return {
    RGBA: 0x1908,
    RGBA16F: 0x881a,
    RGBA8: 0x8058,
    HALF_FLOAT: 0x140b,
    UNSIGNED_BYTE: 0x1401,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    CLAMP_TO_EDGE: 0x812f,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    FRAMEBUFFER: 0x8d40,
    COLOR_ATTACHMENT0: 0x8ce0,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    _calls: calls,
    createTexture: () => ({} as WebGLTexture),
    createFramebuffer: () => ({} as WebGLFramebuffer),
    bindTexture: (...a) => track('bindTexture', a),
    texImage2D: (...a) => track('texImage2D', a),
    texParameteri: (...a) => track('texParameteri', a),
    bindFramebuffer: (...a) => track('bindFramebuffer', a),
    framebufferTexture2D: (...a) => track('framebufferTexture2D', a),
    checkFramebufferStatus: () => (opts.framebufferComplete !== false ? 0x8cd5 : 0x8cd6),
    deleteTexture: (...a) => track('deleteTexture', a),
    deleteFramebuffer: (...a) => track('deleteFramebuffer', a),
    viewport: (...a) => track('viewport', a),
    getExtension: (name: string) =>
      opts.hasFloatExt && name === 'EXT_color_buffer_float' ? {} : null,
  };
}

describe('createFramebuffer', () => {
  it('uses RGBA16F when EXT_color_buffer_float is available', () => {
    const gl = makeMockGL({ hasFloatExt: true });
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 224, 256);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.format).toBe('RGBA16F');
      expect(r.value.width).toBe(224);
      expect(r.value.height).toBe(256);
    }
  });

  it('falls back to RGBA8 when no float extension', () => {
    const gl = makeMockGL({ hasFloatExt: false });
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 224, 256);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.format).toBe('RGBA8');
  });

  it('honors preferHighPrecision: false', () => {
    const gl = makeMockGL({ hasFloatExt: true });
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 224, 256, {
      preferHighPrecision: false,
    });
    if (isOk(r)) expect(r.value.format).toBe('RGBA8');
  });

  it('returns err when texture creation fails', () => {
    const gl = makeMockGL();
    gl.createTexture = () => null;
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 16, 16);
    expect(isErr(r)).toBe(true);
  });

  it('returns err when framebuffer status is not COMPLETE', () => {
    const gl = makeMockGL({ framebufferComplete: false });
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 16, 16);
    expect(isErr(r)).toBe(true);
    // Should clean up the texture + framebuffer it created.
    expect(gl._calls['deleteTexture']).toBeDefined();
    expect(gl._calls['deleteFramebuffer']).toBeDefined();
  });

  it('bind() sets the framebuffer and viewport', () => {
    const gl = makeMockGL();
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 224, 256);
    if (isOk(r)) {
      r.value.bind();
      expect(gl._calls['viewport']).toContainEqual([0, 0, 224, 256]);
    }
  });

  it('dispose() is idempotent and bind() throws after dispose', () => {
    const gl = makeMockGL();
    const r = createFramebuffer(gl as unknown as WebGL2RenderingContext, 16, 16);
    if (isOk(r)) {
      r.value.dispose();
      r.value.dispose(); // no-op
      expect(() => r.value.bind()).toThrow(/invariant/);
    }
  });

  it('uses NEAREST filter by default (pixel art)', () => {
    const gl = makeMockGL();
    createFramebuffer(gl as unknown as WebGL2RenderingContext, 16, 16);
    const filterCalls = (gl._calls['texParameteri'] ?? []).filter(
      (args) => args[1] === gl.TEXTURE_MIN_FILTER || args[1] === gl.TEXTURE_MAG_FILTER,
    );
    for (const args of filterCalls) expect(args[2]).toBe(gl.NEAREST);
  });
});
