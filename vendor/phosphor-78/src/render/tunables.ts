// AR9 + N2: hot-tunable render parameters as signals.
//
// Read by render passes, written by companion sliders (story 5.3)
// and by user-settings code. Game-side render code only READS via
// `.value` or `.subscribe`. CR10.

import { signal, type Signal } from '@/util/signals';

/**
 * Phosphor decay factor in (0, 1). 1.0 = previous frame keeps full
 * brightness forever (infinite trail); 0.0 = no persistence at all.
 *
 * Story 5.12: dropped default from 0.92 → 0.78. 0.92 produced a
 * trail so heavy that GAME OVER text bled through several frames
 * after a restart, making the restart feel broken. 0.78 still
 * gives a visible CRT glow tail (0.78^15 ≈ 0.026, fades in ~250ms)
 * but the new state is unmistakeably visible immediately.
 */
export const phosphorDecay: Signal<number> = signal(0.78);

/**
 * Scanline density in lines per logical pixel. The composite
 * shader (story 4.3+) reads this. 2.0 = one dark scanline every
 * 2 pixels of screen height.
 */
export const scanlineDensity: Signal<number> = signal(2.0);

/**
 * Curvature strength in (0, 1). 0 = flat. Higher values bow the
 * image like an old CRT. Read by the composite shader.
 */
export const curvatureStrength: Signal<number> = signal(0.05);

/**
 * Halation (bright-bloom) strength in (0, 1). Read by the
 * composite shader (story 4.5).
 */
export const halationStrength: Signal<number> = signal(0.3);
