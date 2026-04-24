// CC6: single pause path used by visibility, blur, and manual pause.
//
// Anything that wants to pause the game calls pause('visibility' | ...);
// the controller wires up the auto-triggers (visibilitychange, blur)
// once and treats them the same as a manual pause. Resume is always
// manual: never auto-resume on focus return because the player may
// have walked away mid-game.

import { log } from '@/util/log';
import { signal } from '@/util/signals';

export type PauseReason = 'visibility' | 'blur' | 'manual';

export interface PauseController {
  pause(reason: PauseReason): void;
  resume(): void;
  isPaused(): boolean;
  reason(): PauseReason | null;
  dispose(): void;
}

export interface PauseHooks {
  onPause?: (reason: PauseReason) => void;
  onResume?: () => void;
}

export interface PauseControllerOptions {
  /** Document used for visibilitychange (defaults to globalThis.document). */
  readonly doc?: Document | null;
  /** Window used for blur (defaults to globalThis.window). */
  readonly win?: Window | null;
  readonly hooks?: PauseHooks;
}

/**
 * Public signal so debug overlay / companion / UI can render pause
 * state without injecting the controller. Single global because at
 * most one game runs per page.
 */
export const pauseState = signal<{ paused: boolean; reason: PauseReason | null }>(
  { paused: false, reason: null },
);

export function createPauseController(
  opts: PauseControllerOptions = {},
): PauseController {
  const doc = opts.doc ?? (typeof document !== 'undefined' ? document : null);
  const win = opts.win ?? (typeof window !== 'undefined' ? window : null);

  let paused = false;
  let reason: PauseReason | null = null;

  const setPaused = (next: boolean, why: PauseReason | null) => {
    if (paused === next && reason === why) return;
    paused = next;
    reason = why;
    pauseState.set({ paused, reason });
    if (paused) {
      log.info(`game paused (${why})`);
      opts.hooks?.onPause?.(why as PauseReason);
    } else {
      log.info('game resumed');
      opts.hooks?.onResume?.();
    }
  };

  const pause = (why: PauseReason) => {
    if (paused) return;
    setPaused(true, why);
  };

  const resume = () => {
    if (!paused) return;
    setPaused(false, null);
  };

  const onVisibility = () => {
    if (doc?.hidden) pause('visibility');
  };
  const onBlur = () => pause('blur');

  doc?.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('blur', onBlur);

  return {
    pause,
    resume,
    isPaused: () => paused,
    reason: () => reason,
    dispose() {
      doc?.removeEventListener('visibilitychange', onVisibility);
      win?.removeEventListener('blur', onBlur);
      // Reset shared state so a fresh controller starts clean.
      if (paused) setPaused(false, null);
    },
  };
}
