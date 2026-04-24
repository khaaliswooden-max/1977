// Shared fake AudioContext for synth tests. Co-located so each
// synth test file can keep its own assertions but share the
// instrumentation boilerplate.

import { vi } from 'vitest';

export interface FakeAudioParam {
  setValueAtTime: ReturnType<typeof vi.fn>;
  linearRampToValueAtTime: ReturnType<typeof vi.fn>;
}

export interface FakeOsc {
  type: OscillatorType;
  frequency: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

export interface FakeGain {
  gain: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

export interface FakeFilter {
  type: BiquadFilterType;
  frequency: FakeAudioParam;
  connect: ReturnType<typeof vi.fn>;
}

export interface FakeBufferSource {
  buffer: AudioBuffer | null;
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

export interface FakeAudioBuffer {
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  data: Float32Array;
  getChannelData(): Float32Array;
}

export interface FakeAudioCtx {
  currentTime: number;
  sampleRate: number;
  createOscillator(): FakeOsc;
  createGain(): FakeGain;
  createBiquadFilter(): FakeFilter;
  createBufferSource(): FakeBufferSource;
  createBuffer(channels: number, length: number, rate: number): FakeAudioBuffer;
}

function makeParam(): FakeAudioParam {
  return {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
}

export interface FakeCtxBundle {
  ctx: FakeAudioCtx;
  oscs: FakeOsc[];
  gains: FakeGain[];
  filters: FakeFilter[];
  bufferSources: FakeBufferSource[];
}

export function makeFakeAudioContext(): FakeCtxBundle {
  const oscs: FakeOsc[] = [];
  const gains: FakeGain[] = [];
  const filters: FakeFilter[] = [];
  const bufferSources: FakeBufferSource[] = [];

  const ctx: FakeAudioCtx = {
    currentTime: 0,
    sampleRate: 48_000,
    createOscillator() {
      const o: FakeOsc = {
        type: 'sine',
        frequency: makeParam(),
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscs.push(o);
      return o;
    },
    createGain() {
      const g: FakeGain = {
        gain: makeParam(),
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
      };
      gains.push(g);
      return g;
    },
    createBiquadFilter() {
      const f: FakeFilter = {
        type: 'lowpass',
        frequency: makeParam(),
        connect: vi.fn().mockReturnThis(),
      };
      filters.push(f);
      return f;
    },
    createBufferSource() {
      const b: FakeBufferSource = {
        buffer: null,
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      bufferSources.push(b);
      return b;
    },
    createBuffer(_channels, length, sampleRate) {
      const data = new Float32Array(length);
      return {
        length,
        sampleRate,
        numberOfChannels: 1,
        data,
        getChannelData: () => data,
      };
    },
  };

  return { ctx, oscs, gains, filters, bufferSources };
}
