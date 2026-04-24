// Pass 1: take a 224x256 Canvas2D source image and upload it as the
// "current frame" texture for the persistence pass to consume.
//
// We keep the GAME RENDER itself as Canvas2D for now (placeholder
// renderer from story 1.18, will eventually become real sprites).
// The pixel data is then uploaded to a GL texture each frame via
// gl.texImage2D — at 224x256 RGBA = 224 KB per upload, well under
// any per-frame budget.

import { createFramebuffer, type Framebuffer } from '@/foundation/framebuffer';
import { buildProgram, FULLSCREEN_TRIANGLE_VERT } from '@/foundation/shader';
import { isErr, ok, type Result } from '@/util/result';

const UPLOAD_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_source;
out vec4 outColor;
void main() {
  // Flip Y because Canvas2D origin is top-left while WebGL
  // texture origin is bottom-left.
  outColor = texture(u_source, vec2(v_uv.x, 1.0 - v_uv.y));
}`;

export interface SourceUploadPass {
  /** Upload the source canvas pixels and produce the frame FB. */
  upload(source: HTMLCanvasElement): Framebuffer;
  dispose(): void;
}

export function createSourceUploadPass(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): Result<SourceUploadPass, Error> {
  const program = buildProgram(gl, FULLSCREEN_TRIANGLE_VERT, UPLOAD_FRAG);
  if (isErr(program)) return program;

  const fb = createFramebuffer(gl, width, height);
  if (isErr(fb)) {
    gl.deleteProgram(program.value);
    return fb;
  }

  // Single source texture we re-upload to every frame.
  const sourceTex = gl.createTexture();
  if (!sourceTex) {
    gl.deleteProgram(program.value);
    fb.value.dispose();
    return { kind: 'err', error: new Error('source-upload: createTexture failed') };
  }
  gl.bindTexture(gl.TEXTURE_2D, sourceTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  const uSource = gl.getUniformLocation(program.value, 'u_source');

  return ok({
    upload(source) {
      // Upload the canvas pixels into our source texture.
      gl.bindTexture(gl.TEXTURE_2D, sourceTex);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );

      // Render the source texture into the framebuffer.
      fb.value.bind();
      gl.useProgram(program.value);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, sourceTex);
      gl.uniform1i(uSource, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      fb.value.unbind();

      return fb.value;
    },
    dispose() {
      gl.deleteProgram(program.value);
      gl.deleteTexture(sourceTex);
      fb.value.dispose();
    },
  });
}
