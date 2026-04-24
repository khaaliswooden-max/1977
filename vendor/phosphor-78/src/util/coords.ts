// ADR-005: gameplay lives in 1978's 224x256 pixel space; the renderer
// converts to NDC at the boundary. Game logic never sees NDC; render
// passes never see PixelPos directly.

export const LOGICAL_WIDTH = 224;
export const LOGICAL_HEIGHT = 256;

export interface PixelPos {
  readonly x: number;
  readonly y: number;
}

export interface NDCPos {
  readonly x: number;
  readonly y: number;
}

/**
 * Map 224x256 framebuffer pixel coordinates to normalized device
 * coordinates ([-1, +1] on both axes). The original CRT origin is
 * top-left, so y is flipped to match WebGL's bottom-left NDC.
 *
 * Pure function. No clamping: a pixel just outside the framebuffer
 * yields an NDC value just outside [-1, +1], which is the correct
 * input for shaders that may sample beyond the frame edge (e.g.
 * curvature distortion).
 */
export function worldToNDC(p: PixelPos): NDCPos {
  return {
    x: (p.x / LOGICAL_WIDTH) * 2 - 1,
    y: 1 - (p.y / LOGICAL_HEIGHT) * 2,
  };
}
