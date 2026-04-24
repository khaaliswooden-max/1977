// ADR-003 + N1 of Epic 4: phosphor-persistence pass.
//
// Each frame: output = mix(currentFrame, previousOutput, decay).
// Implemented as ping-pong between two RGBA16F framebuffers so the
// previous-frame texture can be sampled while we write the new one.
// RGBA16F matters here — at RGBA8, the mix() of decayed-mixed-decayed-...
// would quantize into visible banding within ~5 frames.

import { createFramebuffer, type Framebuffer } from '@/foundation/framebuffer';
import { buildProgram, FULLSCREEN_TRIANGLE_VERT } from '@/foundation/shader';
import { phosphorDecay } from '@/render/tunables';
import { isErr, type Result, ok } from '@/util/result';

const PERSISTENCE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_current;
uniform sampler2D u_previous;
uniform float u_decay;
out vec4 outColor;
void main() {
  vec4 cur = texture(u_current, v_uv);
  vec4 prev = texture(u_previous, v_uv);
  // Take the maximum of (current, previous*decay) per channel so a
  // bright pixel decays smoothly to black instead of being instantly
  // overwritten by a darker current-frame sample.
  vec4 decayed = prev * u_decay;
  outColor = max(cur, decayed);
}`;

export interface PersistencePass {
  /** Process one frame. Returns the FB containing the output. */
  apply(currentFrame: Framebuffer): Framebuffer;
  /**
   * Wipe both ping-pong framebuffers to black. Story 5.12: called
   * by the pipeline on game-mode transitions (gameover→playing,
   * etc.) so the GAME OVER text doesn't leave a phosphor trail
   * across the new playing state.
   */
  clear(): void;
  dispose(): void;
}

export function createPersistencePass(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): Result<PersistencePass, Error> {
  const program = buildProgram(gl, FULLSCREEN_TRIANGLE_VERT, PERSISTENCE_FRAG);
  if (isErr(program)) return program;

  const fbA = createFramebuffer(gl, width, height);
  if (isErr(fbA)) {
    gl.deleteProgram(program.value);
    return fbA;
  }
  const fbB = createFramebuffer(gl, width, height);
  if (isErr(fbB)) {
    gl.deleteProgram(program.value);
    fbA.value.dispose();
    return fbB;
  }

  const uCurrent = gl.getUniformLocation(program.value, 'u_current');
  const uPrevious = gl.getUniformLocation(program.value, 'u_previous');
  const uDecay = gl.getUniformLocation(program.value, 'u_decay');

  // Clear both framebuffers to black so the first frame doesn't
  // mix with garbage texture contents.
  for (const fb of [fbA.value, fbB.value]) {
    fb.bind();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    fb.unbind();
  }

  let writeTarget = fbA.value;
  let readSource = fbB.value;

  return ok({
    apply(currentFrame) {
      writeTarget.bind();
      gl.useProgram(program.value);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentFrame.texture);
      gl.uniform1i(uCurrent, 0);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, readSource.texture);
      gl.uniform1i(uPrevious, 1);

      gl.uniform1f(uDecay, phosphorDecay.value);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      writeTarget.unbind();

      // Swap roles: this frame's output is next frame's previous.
      const tmp = writeTarget;
      writeTarget = readSource;
      readSource = tmp;

      return readSource;
    },
    clear() {
      for (const fb of [fbA.value, fbB.value]) {
        fb.bind();
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        fb.unbind();
      }
    },
    dispose() {
      gl.deleteProgram(program.value);
      fbA.value.dispose();
      fbB.value.dispose();
    },
  });
}
