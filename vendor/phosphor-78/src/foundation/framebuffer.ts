// ADR-003 + NFR5 + AR7: Off-screen framebuffer with RGBA16F preferred,
// RGBA8 fallback. The persistence pass (story 4.2) needs RGBA16F to
// avoid 8-bit accumulation banding when blending the previous frame
// into the current one.
//
// Lifecycle: create -> bind/unbind any number of times -> dispose.
// Caller owns the GL context; this file does not call getContext.

import { hasColorBufferFloat } from '@/foundation/webgl-context';
import { err, ok, type Result } from '@/util/result';

export type FramebufferFormat = 'RGBA16F' | 'RGBA8';

export interface Framebuffer {
  readonly format: FramebufferFormat;
  readonly width: number;
  readonly height: number;
  /** Bind for drawing INTO this framebuffer. */
  bind(): void;
  /** Restore the default framebuffer. */
  unbind(): void;
  /** The underlying GL texture (for sampling in a later pass). */
  readonly texture: WebGLTexture;
  dispose(): void;
}

export interface FramebufferOptions {
  readonly preferHighPrecision?: boolean;
  /** Texture sampling filter. Defaults to NEAREST for pixel art. */
  readonly filter?: 'NEAREST' | 'LINEAR';
}

export function createFramebuffer(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  opts: FramebufferOptions = {},
): Result<Framebuffer, Error> {
  const wantHigh = opts.preferHighPrecision !== false;
  const useFloat = wantHigh && hasColorBufferFloat(gl);
  const format: FramebufferFormat = useFloat ? 'RGBA16F' : 'RGBA8';

  const texture = gl.createTexture();
  if (!texture) return err(new Error('framebuffer: createTexture returned null'));
  gl.bindTexture(gl.TEXTURE_2D, texture);
  if (useFloat) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      width,
      height,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null,
    );
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
  }
  const filter = opts.filter === 'LINEAR' ? gl.LINEAR : gl.NEAREST;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    gl.deleteTexture(texture);
    return err(new Error('framebuffer: createFramebuffer returned null'));
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    return err(
      new Error(`framebuffer: status not COMPLETE (got 0x${status.toString(16)})`),
    );
  }

  let disposed = false;
  return ok({
    format,
    width,
    height,
    texture,
    bind() {
      if (disposed) throw new Error('invariant: framebuffer used after dispose');
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.viewport(0, 0, width, height);
    },
    unbind() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
    },
  });
}
