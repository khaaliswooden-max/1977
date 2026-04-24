import { describe, expect, it } from 'vitest';
import { createWebGL2Context } from '@/foundation/webgl-context';
import { isErr, isOk } from '@/util/result';

describe('createWebGL2Context', () => {
  it('returns err when getContext yields null', () => {
    const fake = {
      getContext: (): null => null,
    } as unknown as HTMLCanvasElement;
    const r = createWebGL2Context(fake);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.message).toMatch(/WebGL2 not supported/);
    }
  });

  it('returns RGBA16F when EXT_color_buffer_float is available', () => {
    const fakeGl = {
      getExtension: (name: string) =>
        name === 'EXT_color_buffer_float' ? {} : null,
    } as unknown as WebGL2RenderingContext;
    const fakeCanvas = {
      getContext: (kind: string) => (kind === 'webgl2' ? fakeGl : null),
    } as unknown as HTMLCanvasElement;
    const r = createWebGL2Context(fakeCanvas);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.colorFormat).toBe('RGBA16F');
    }
  });

  it('falls back to RGBA8 when no float extensions are available', () => {
    const fakeGl = {
      getExtension: (): null => null,
    } as unknown as WebGL2RenderingContext;
    const fakeCanvas = {
      getContext: (kind: string) => (kind === 'webgl2' ? fakeGl : null),
    } as unknown as HTMLCanvasElement;
    const r = createWebGL2Context(fakeCanvas);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.colorFormat).toBe('RGBA8');
    }
  });

  it('honors preferHighPrecision: false', () => {
    const fakeGl = {
      getExtension: (name: string) =>
        name === 'EXT_color_buffer_float' ? {} : null,
    } as unknown as WebGL2RenderingContext;
    const fakeCanvas = {
      getContext: (kind: string) => (kind === 'webgl2' ? fakeGl : null),
    } as unknown as HTMLCanvasElement;
    const r = createWebGL2Context(fakeCanvas, { preferHighPrecision: false });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.colorFormat).toBe('RGBA8');
    }
  });
});
