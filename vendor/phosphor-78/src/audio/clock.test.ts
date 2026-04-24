import { describe, expect, it } from 'vitest';
import { AudioClock, LOOKAHEAD_MS, POLL_MS } from '@/audio/clock';

class FakeClockSource {
  currentTime = 0;
}

describe('AudioClock', () => {
  it('constants are sane', () => {
    expect(LOOKAHEAD_MS).toBeGreaterThan(POLL_MS);
    expect(POLL_MS).toBeGreaterThan(0);
  });

  it('exposes currentTime from the source', () => {
    const src = new FakeClockSource();
    src.currentTime = 1.5;
    const clk = new AudioClock(src);
    expect(clk.currentTime).toBe(1.5);
  });

  it('lookaheadUntil = currentTime + LOOKAHEAD_MS', () => {
    const src = new FakeClockSource();
    src.currentTime = 2.0;
    const clk = new AudioClock(src);
    expect(clk.lookaheadUntil()).toBeCloseTo(2.0 + LOOKAHEAD_MS / 1000);
  });

  it('scheduleAhead receives the lookahead bound', () => {
    const src = new FakeClockSource();
    src.currentTime = 0.5;
    const clk = new AudioClock(src);
    let received = -1;
    clk.scheduleAhead((until) => {
      received = until;
    });
    expect(received).toBeCloseTo(0.5 + LOOKAHEAD_MS / 1000);
  });

  it('currentStep advances faster as invaders die', () => {
    const src = new FakeClockSource();
    const clk = new AudioClock(src);
    src.currentTime = 1.0;
    const stepWith55 = clk.currentStep(55);
    const stepWith10 = clk.currentStep(10);
    // Fewer invaders -> shorter interval -> larger step index for
    // the same wall time.
    expect(stepWith10).toBeGreaterThan(stepWith55);
  });

  it('currentStep is monotonic in time for fixed N', () => {
    const src = new FakeClockSource();
    const clk = new AudioClock(src);
    src.currentTime = 0.1;
    const a = clk.currentStep(20);
    src.currentTime = 5.0;
    const b = clk.currentStep(20);
    expect(b).toBeGreaterThan(a);
  });

  it('custom stepInterval is honored', () => {
    const src = new FakeClockSource();
    src.currentTime = 1.0;
    const clk = new AudioClock(src, { stepInterval: () => 100 });
    // 1 second / 0.1s per step = step 10
    expect(clk.currentStep(42)).toBe(10);
  });

  it('clamps invader count to [1, 55] in the default placeholder', () => {
    const src = new FakeClockSource();
    src.currentTime = 1.0;
    const clk = new AudioClock(src);
    // Out-of-range input should not crash or yield bizarre values.
    expect(() => clk.currentStep(0)).not.toThrow();
    expect(() => clk.currentStep(-3)).not.toThrow();
    expect(() => clk.currentStep(9999)).not.toThrow();
  });
});
