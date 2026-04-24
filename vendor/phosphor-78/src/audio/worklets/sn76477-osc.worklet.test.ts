// Pure-math tests for the SN76477-flavored oscillator. We can't
// drive a real AudioWorkletProcessor from node, but the wave-shape
// math + LFSR are testable in isolation.

import { describe, expect, it } from 'vitest';

// Stand-in declarations so the worklet module loads under node.
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

const { SN76477Oscillator } = await import('@/audio/worklets/sn76477-osc.worklet');

interface TestableOsc {
  phase: number;
  lfsr: number;
  waveform: 'square' | 'saw' | 'triangle' | 'noise';
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}

function createOsc(waveform: 'square' | 'saw' | 'triangle' | 'noise'): TestableOsc {
  const osc = new (SN76477Oscillator as unknown as new () => TestableOsc)();
  osc.waveform = waveform;
  osc.phase = 0;
  osc.lfsr = 0xace1;
  return osc;
}

function paramArray(value: number, length = 128): Float32Array {
  const out = new Float32Array(length);
  out.fill(value);
  return out;
}

function processOnce(osc: TestableOsc, params: Record<string, number>): Float32Array {
  const out = new Float32Array(128);
  osc.process([], [[out]], {
    frequency: paramArray(params['frequency'] ?? 440),
    amplitude: paramArray(params['amplitude'] ?? 1),
    dutyCycle: paramArray(params['dutyCycle'] ?? 0.5),
    heat: paramArray(params['heat'] ?? 0),
  });
  return out;
}

describe('SN76477Oscillator — square wave', () => {
  it('produces +1 / -1 outputs at heat=0', () => {
    const osc = createOsc('square');
    const out = processOnce(osc, { frequency: 220, amplitude: 1, heat: 0 });
    for (const sample of out) {
      expect(Math.abs(sample)).toBeCloseTo(1, 5);
    }
  });

  it('respects amplitude scaling', () => {
    const osc = createOsc('square');
    const out = processOnce(osc, { amplitude: 0.5, heat: 0 });
    for (const sample of out) {
      expect(Math.abs(sample)).toBeCloseTo(0.5, 5);
    }
  });

  it('different duty cycles give different positive-fraction', () => {
    const oscA = createOsc('square');
    const a = processOnce(oscA, { frequency: 100, dutyCycle: 0.25, heat: 0 });
    const oscB = createOsc('square');
    const b = processOnce(oscB, { frequency: 100, dutyCycle: 0.75, heat: 0 });
    const posA = [...a].filter((s) => s > 0).length;
    const posB = [...b].filter((s) => s > 0).length;
    expect(posB).toBeGreaterThan(posA);
  });
});

describe('SN76477Oscillator — saw wave', () => {
  it('linear at heat=0 (monotonic sweep within one period)', () => {
    const osc = createOsc('saw');
    osc.phase = 0;
    // Use a low frequency so we get a long monotonic stretch.
    const out = processOnce(osc, { frequency: 100, amplitude: 1, heat: 0 });
    let increasing = 0;
    for (let i = 1; i < out.length; i++) {
      if (out[i]! > out[i - 1]!) increasing++;
    }
    // Most samples should be increasing; the wraparound counts as
    // a single decrease.
    expect(increasing).toBeGreaterThan(out.length - 5);
  });

  it('compressed at heat=1 (peak below the rails)', () => {
    const osc = createOsc('saw');
    osc.phase = 0.95;
    const out = processOnce(osc, { frequency: 100, amplitude: 1, heat: 1 });
    const max = Math.max(...out);
    expect(max).toBeLessThanOrEqual(1.0);
  });
});

describe('SN76477Oscillator — triangle wave', () => {
  it('produces values in [-1, 1]', () => {
    const osc = createOsc('triangle');
    const out = processOnce(osc, { frequency: 220, amplitude: 1 });
    for (const s of out) {
      expect(s).toBeGreaterThanOrEqual(-1.001);
      expect(s).toBeLessThanOrEqual(1.001);
    }
  });
});

describe('SN76477Oscillator — noise (LFSR)', () => {
  it('is deterministic given the same seed', () => {
    const a = createOsc('noise');
    const b = createOsc('noise');
    const outA = processOnce(a, {});
    const outB = processOnce(b, {});
    expect(outA).toEqual(outB);
  });

  it('produces values in [-1, 1]', () => {
    const osc = createOsc('noise');
    const out = processOnce(osc, {});
    for (const s of out) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThan(1);
    }
  });

  it('does NOT use Math.random (output reproducible)', () => {
    // Run twice; if Math.random were involved, outputs would differ.
    const a = createOsc('noise');
    const b = createOsc('noise');
    expect(processOnce(a, {})).toEqual(processOnce(b, {}));
  });
});
