// ADR-002 + N1: AudioContext-driven master clock + lookahead scheduler.
//
// All gameplay timing reads from this clock, never from rAF or
// performance.now(). The lookahead pattern (Chris Wilson, "A Tale of
// Two Clocks") schedules audio events into AudioContext's
// sample-accurate future, so jitter in our setTimeout poll cannot
// affect the trigger time the listener actually hears.

import { nextStepInterval } from '@/constants/computer-archeology';

export const LOOKAHEAD_MS = 100;
export const POLL_MS = 25;

/**
 * Adapts the AudioContext interface we use down to a small,
 * easily-mockable surface. Production code passes a real
 * AudioContext; tests pass a fake.
 */
export interface ClockSource {
  readonly currentTime: number;
}

export type StepIntervalFn = (remainingInvaders: number) => number;

export interface AudioClockOptions {
  /** ms-per-step function. Provisional default until story 2.1. */
  readonly stepInterval?: StepIntervalFn;
  readonly lookaheadMs?: number;
}

// Story 2.1: now backed by the ComputerArcheology-derived
// MARCH_TEMPO_TABLE rather than a placeholder linear curve.
const DEFAULT_STEP_INTERVAL: StepIntervalFn = nextStepInterval;

export class AudioClock {
  readonly source: ClockSource;
  readonly stepInterval: StepIntervalFn;
  readonly lookaheadMs: number;

  constructor(source: ClockSource, opts: AudioClockOptions = {}) {
    this.source = source;
    this.stepInterval = opts.stepInterval ?? DEFAULT_STEP_INTERVAL;
    this.lookaheadMs = opts.lookaheadMs ?? LOOKAHEAD_MS;
  }

  get currentTime(): number {
    return this.source.currentTime;
  }

  /**
   * Which march-step index should be active right now given how many
   * invaders are still alive. Pure function of clock time and
   * remainingInvaders. Story 2.1 may revise the formula once the
   * accumulating-step semantics from the original ROM are honored
   * exactly; for placeholder purposes a uniform-tempo division is
   * fine.
   */
  currentStep(remainingInvaders: number): number {
    const intervalSec = this.stepInterval(remainingInvaders) / 1000;
    if (intervalSec <= 0) return 0;
    return Math.floor(this.source.currentTime / intervalSec);
  }

  /** End of the lookahead window in AudioContext seconds. */
  lookaheadUntil(): number {
    return this.source.currentTime + this.lookaheadMs / 1000;
  }

  /**
   * Convenience: pass a scheduler function the upper bound of the
   * lookahead window. The scheduler should enqueue all events whose
   * trigger time is <= `until` via setValueAtTime / etc.
   */
  scheduleAhead(scheduler: (until: number) => void): void {
    scheduler(this.lookaheadUntil());
  }
}
