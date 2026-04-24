// ADR-010 + N1: fixed-step main loop, slave to the audio clock.
//
// `requestAnimationFrame` ticks at the display refresh rate (60Hz on
// most monitors, 120/144Hz on others, 1Hz when the tab is hidden).
// We accumulate elapsed wall time and step the reducer at exactly
// 60Hz logical, no matter what the screen does. The accumulator is
// capped at MAX_ACCUM_STEPS frames worth so a tab returning from
// background doesn't have to "catch up" hundreds of frames in one
// rAF (the spiral-of-death anti-pattern).

import { tick } from '@/game/reducer';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';
import type { InputSnapshot } from '@/types/input';

export const STEP_MS = 1000 / 60;
export const MAX_ACCUM_STEPS = 5;

export interface InputReader {
  snapshot(): InputSnapshot;
}

export interface RenderCallback {
  (state: GameState, alpha: number): void;
}

export interface EventConsumer {
  (events: readonly GameEvent[]): void;
}

export interface LoopHandle {
  /** Stop the loop; returns the final state. */
  stop(): GameState;
  /** Force a pause (skip ticks but keep raf draining accumulator). */
  pause(): void;
  resume(): void;
  isPaused(): boolean;
}

export interface LoopAdapters {
  readonly raf: (cb: (t: number) => void) => number;
  readonly cancelRaf: (id: number) => void;
  readonly now: () => number;
}

export interface LoopOptions {
  readonly clock: Clock;
  readonly input: InputReader;
  readonly render: RenderCallback;
  readonly onEvents?: EventConsumer;
  /** Override the rAF/now adapters for testing. */
  readonly adapters?: LoopAdapters;
}

const browserAdapters = (): LoopAdapters => ({
  raf: (cb) => requestAnimationFrame(cb),
  cancelRaf: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
});

export function startGameLoop(
  initial: GameState,
  opts: LoopOptions,
): LoopHandle {
  const adapters = opts.adapters ?? browserAdapters();
  let state = initial;
  let lastFrameTs = adapters.now();
  let accum = 0;
  let rafId = 0;
  let stopped = false;
  let paused = false;

  const frame = (now: number) => {
    if (stopped) return;
    const dt = now - lastFrameTs;
    lastFrameTs = now;
    if (!paused) accum += dt;

    // Cap to prevent spiral-of-death after a long pause/throttle.
    const maxAccumMs = MAX_ACCUM_STEPS * STEP_MS;
    if (accum > maxAccumMs) accum = maxAccumMs;

    while (accum >= STEP_MS) {
      const { next, events } = tick(state, opts.input.snapshot(), opts.clock);
      state = next;
      if (events.length > 0) opts.onEvents?.(events);
      accum -= STEP_MS;
    }

    const alpha = accum / STEP_MS;
    opts.render(state, alpha);

    rafId = adapters.raf(frame);
  };

  rafId = adapters.raf(frame);

  return {
    stop() {
      stopped = true;
      adapters.cancelRaf(rafId);
      return state;
    },
    pause() {
      paused = true;
      // Drop accumulated time so resume doesn't burst-tick.
      accum = 0;
    },
    resume() {
      paused = false;
      lastFrameTs = adapters.now();
    },
    isPaused() {
      return paused;
    },
  };
}
