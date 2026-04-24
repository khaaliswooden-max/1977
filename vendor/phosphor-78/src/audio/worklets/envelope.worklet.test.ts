// Tests for the ADSR envelope worklet. Same harness pattern as
// sn76477-osc.worklet.test.ts: stub the worklet globals at import
// time and exercise the processor's process() method directly.

import { describe, expect, it } from 'vitest';

(globalThis as { sampleRate?: number }).sampleRate = 48_000;
(globalThis as { AudioWorkletProcessor?: unknown }).AudioWorkletProcessor =
  class StubProcessor {
    port = {
      onmessage: null,
      postMessage: () => {},
      close: () => {},
      start: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
(globalThis as { registerProcessor?: () => void }).registerProcessor = () => {};

const { EnvelopeProcessor, msToSamples } = await import(
  '@/audio/worklets/envelope.worklet'
);

interface TestableEnv {
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

function createEnv(): TestableEnv {
  return new (EnvelopeProcessor as unknown as new () => TestableEnv)();
}

function paramArray(value: number, length = 128): Float32Array {
  const out = new Float32Array(length);
  out.fill(value);
  return out;
}

/** Run process() N blocks (each 128 samples) and return the
 *  concatenated output. `gateFn(blockIndex) -> 0 or 1`. */
function runBlocks(
  env: TestableEnv,
  blocks: number,
  params: Record<string, number>,
  gateFn: (block: number) => number,
): Float32Array {
  const out = new Float32Array(blocks * 128);
  for (let b = 0; b < blocks; b++) {
    const block = new Float32Array(128);
    env.process([], [[block]], {
      gate: paramArray(gateFn(b)),
      attack: paramArray(params['attack'] ?? 5),
      decay: paramArray(params['decay'] ?? 50),
      sustain: paramArray(params['sustain'] ?? 0.6),
      release: paramArray(params['release'] ?? 100),
    });
    out.set(block, b * 128);
  }
  return out;
}

describe('msToSamples', () => {
  it('converts ms to samples at the global sampleRate', () => {
    expect(msToSamples(0)).toBe(0);
    expect(msToSamples(1)).toBe(48); // 1 ms @ 48kHz
    expect(msToSamples(1000)).toBe(48_000);
  });

  it('clamps negative input to 0', () => {
    expect(msToSamples(-10)).toBe(0);
  });
});

describe('EnvelopeProcessor — gate handling', () => {
  it('idle stays at 0 when gate never opens', () => {
    const env = createEnv();
    const out = runBlocks(env, 4, {}, () => 0);
    for (const s of out) expect(s).toBe(0);
  });

  it('attack ramps from 0 toward 1 on gate-on', () => {
    const env = createEnv();
    // Long attack so we can observe the ramp; very short decay/release.
    const out = runBlocks(
      env,
      4,
      { attack: 10, decay: 1, sustain: 1, release: 1 },
      () => 1,
    );
    expect(out[0]).toBeLessThan(0.5);
    expect(out[out.length - 1]).toBeGreaterThan(0.5);
  });

  it('reaches sustain level after attack + decay', () => {
    const env = createEnv();
    // Use very short A/D so by sample 200 we should be at sustain.
    const out = runBlocks(
      env,
      4,
      { attack: 1, decay: 1, sustain: 0.4, release: 100 },
      () => 1,
    );
    // At the end of 4 blocks (~10ms) we're past A+D and at sustain.
    expect(out[out.length - 1]).toBeCloseTo(0.4, 1);
  });

  it('release brings the envelope back to 0', () => {
    const env = createEnv();
    // Hold gate for first 2 blocks, then release.
    const out = runBlocks(
      env,
      8,
      { attack: 1, decay: 1, sustain: 0.6, release: 5 },
      (b) => (b < 2 ? 1 : 0),
    );
    // By the last sample of 8 blocks (~21ms total, release was 5ms),
    // we've fully released back to 0.
    expect(out[out.length - 1]).toBeCloseTo(0, 1);
  });

  it('output is bounded to [0, 1]', () => {
    const env = createEnv();
    const out = runBlocks(env, 6, { attack: 5, decay: 5, sustain: 0.7, release: 5 }, (b) => (b < 3 ? 1 : 0));
    for (const s of out) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1.001);
    }
  });

  it('does not use Date.now or Math.random (sample-accurate)', () => {
    // Run twice with identical inputs; outputs must match exactly.
    const a = createEnv();
    const b = createEnv();
    const outA = runBlocks(a, 6, { attack: 5, decay: 5, sustain: 0.7, release: 5 }, (i) => (i < 3 ? 1 : 0));
    const outB = runBlocks(b, 6, { attack: 5, decay: 5, sustain: 0.7, release: 5 }, (i) => (i < 3 ? 1 : 0));
    expect(outA).toEqual(outB);
  });
});
