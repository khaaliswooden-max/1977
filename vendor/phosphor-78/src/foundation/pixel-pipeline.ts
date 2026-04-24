// AR6 + NFR6 + ADR-005: HiDPI + integer-scale pixel pipeline.
//
// The original 1978 framebuffer is 224x256. We render game pixels at
// that exact resolution (in src/game/) and let this module scale them
// up to physical screen pixels by an INTEGER factor only. Non-integer
// scaling = blurry pixels = the entire authenticity claim collapses.
//
// CSS `image-rendering: pixelated` ensures the GPU does
// nearest-neighbor upscaling rather than bilinear smoothing.

import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/util/coords';

export interface ViewportSize {
  /** CSS pixels available for the canvas (typically window.innerWidth/Height) */
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Physical-pixel ratio (window.devicePixelRatio). */
  readonly devicePixelRatio: number;
}

export interface PixelLayout {
  /** The integer scale factor applied to logical pixels. */
  readonly scale: number;
  /** Backing canvas size in physical (drawing buffer) pixels. */
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  /** Element size in CSS pixels (canvas.style). */
  readonly cssWidth: number;
  readonly cssHeight: number;
}

/**
 * Compute the largest integer scale factor that fits the framebuffer
 * inside the viewport. Pure: takes a snapshot of viewport+dpr, returns
 * a layout. Caller is responsible for re-running on resize.
 *
 * Scale is computed in PHYSICAL pixels (cssDimension * dpr), so a
 * Retina screen with dpr=2 yields a higher integer scale than a
 * non-Retina screen at the same CSS size.
 */
export function computePixelLayout(opts: ViewportSize): PixelLayout {
  const physicalW = opts.cssWidth * opts.devicePixelRatio;
  const physicalH = opts.cssHeight * opts.devicePixelRatio;
  const scaleByWidth = Math.floor(physicalW / LOGICAL_WIDTH);
  const scaleByHeight = Math.floor(physicalH / LOGICAL_HEIGHT);
  const scale = Math.max(1, Math.min(scaleByWidth, scaleByHeight));

  const canvasWidth = LOGICAL_WIDTH * scale;
  const canvasHeight = LOGICAL_HEIGHT * scale;
  // CSS dimensions: backing pixels divided by dpr so the element
  // visually occupies (canvasWidth / dpr) CSS pixels — this gives the
  // sharpest possible mapping (one logical pixel = `scale` physical
  // pixels, not 1/dpr fractional CSS pixels).
  const cssWidth = canvasWidth / opts.devicePixelRatio;
  const cssHeight = canvasHeight / opts.devicePixelRatio;

  return { scale, canvasWidth, canvasHeight, cssWidth, cssHeight };
}

/**
 * Apply a layout to a canvas element. Backing buffer in physical
 * pixels, CSS box in logical pixels, image-rendering pixelated to
 * defeat browser smoothing during the upscale.
 */
export function applyPixelLayout(
  canvas: HTMLCanvasElement,
  layout: PixelLayout,
): void {
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;
  canvas.style.width = `${layout.cssWidth}px`;
  canvas.style.height = `${layout.cssHeight}px`;
  canvas.style.imageRendering = 'pixelated';
}

/**
 * Convenience: compute + apply in one call using window globals.
 * Returns the layout that was applied.
 */
export function setupPixelPipeline(canvas: HTMLCanvasElement): PixelLayout {
  const layout = computePixelLayout({
    cssWidth: window.innerWidth,
    cssHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  });
  applyPixelLayout(canvas, layout);
  return layout;
}
