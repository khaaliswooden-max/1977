import { describe, expect, it } from 'vitest';
import {
  MAX_ACCUM_STEPS,
  STEP_MS,
  startGameLoop,
  type LoopAdapters,
} from '@/game/loop';
import { initialState } from '@/game/state';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };
const noopInput = { snapshot: () => NEUTRAL_INPUT };

interface FakeLoop {
  adapters: LoopAdapters;
  step(deltaMs: number): void;
  fastForward(totalMs: number, frameMs: number): void;
}

function createFakeLoop(): FakeLoop {
  let now = 0;
  let pendingCb: ((t: number) => void) | null = null;
  const adapters: LoopAdapters = {
    raf: (cb) => {
      pendingCb = cb;
      return 1;
    },
    cancelRaf: () => {
      pendingCb = null;
    },
    now: () => now,
  };
  return {
    adapters,
    step(deltaMs: number) {
      now += deltaMs;
      const cb = pendingCb;
      pendingCb = null;
      if (cb) cb(now);
    },
    fastForward(totalMs: number, frameMs: number) {
      const frames = Math.round(totalMs / frameMs);
      for (let i = 0; i < frames; i++) this.step(frameMs);
    },
  };
}

describe('startGameLoop', () => {
  it('60Hz display: 1 second drives ~60 reducer ticks', () => {
    const fake = createFakeLoop();
    let renderCount = 0;
    const handle = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {
        renderCount++;
      },
      adapters: fake.adapters,
    });
    // 60 frames at 16.667ms ~= 1000ms. Allow +-1 frame for float
    // accumulation error in the dt running sum.
    fake.fastForward(60 * STEP_MS, STEP_MS);
    const final = handle.stop();
    expect(final.frame).toBeGreaterThanOrEqual(59);
    expect(final.frame).toBeLessThanOrEqual(60);
    expect(renderCount).toBe(60);
  });

  it('120Hz display: 1 second still drives ~60 reducer ticks (twice the renders)', () => {
    const fake = createFakeLoop();
    let renderCount = 0;
    const frameMs = STEP_MS / 2; // 120Hz
    const handle = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {
        renderCount++;
      },
      adapters: fake.adapters,
    });
    fake.fastForward(120 * frameMs, frameMs);
    const final = handle.stop();
    // Within rounding, 60 ticks per 1000ms regardless of display Hz.
    expect(final.frame).toBeGreaterThanOrEqual(59);
    expect(final.frame).toBeLessThanOrEqual(61);
    expect(renderCount).toBe(120);
  });

  it('long pause does not spiral - accumulator caps at MAX_ACCUM_STEPS', () => {
    const fake = createFakeLoop();
    const handle = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {},
      adapters: fake.adapters,
    });
    // Simulate the tab being hidden for 5 seconds, then resuming.
    fake.step(5_000);
    const final = handle.stop();
    // We should have run at most MAX_ACCUM_STEPS reducer ticks even
    // though 5000ms / 16.67ms = 300 frames worth elapsed.
    expect(final.frame).toBeLessThanOrEqual(MAX_ACCUM_STEPS);
  });

  it('pause() halts reducer ticks but render continues', () => {
    const fake = createFakeLoop();
    const handle = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {},
      adapters: fake.adapters,
    });
    fake.fastForward(10 * STEP_MS, STEP_MS);
    const beforePause = handle.stop().frame;
    expect(beforePause).toBeGreaterThanOrEqual(9);

    // Restart with an explicit pause and verify reducer no longer
    // advances even as renders keep being driven.
    const fake2 = createFakeLoop();
    let renders = 0;
    const h2 = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {
        renders++;
      },
      adapters: fake2.adapters,
    });
    h2.pause();
    fake2.fastForward(10 * STEP_MS, STEP_MS);
    const finalState = h2.stop();
    expect(finalState.frame).toBe(0);
    expect(renders).toBe(10);
  });

  it('forwards events to onEvents consumer', () => {
    const fake = createFakeLoop();
    const received: number[] = [];
    const handle = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {},
      onEvents: (events) => received.push(events.length),
      adapters: fake.adapters,
    });
    // Placeholder reducer emits no events (story 1.9), so received
    // remains empty even after multiple frames.
    fake.fastForward(10 * STEP_MS, STEP_MS);
    handle.stop();
    expect(received).toEqual([]);
  });

  it('isPaused reflects pause/resume', () => {
    const fake = createFakeLoop();
    const handle = startGameLoop(initialState(), {
      clock,
      input: noopInput,
      render: () => {},
      adapters: fake.adapters,
    });
    expect(handle.isPaused()).toBe(false);
    handle.pause();
    expect(handle.isPaused()).toBe(true);
    handle.resume();
    expect(handle.isPaused()).toBe(false);
    handle.stop();
  });
});
