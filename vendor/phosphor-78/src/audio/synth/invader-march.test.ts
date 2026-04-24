import { describe, expect, it, vi } from 'vitest';
import { AudioClock } from '@/audio/clock';
import {
  MARCH_PITCHES_HZ,
  MARCH_NOTE_DURATION_MS,
  createInvaderMarchSynth,
} from '@/audio/synth/invader-march';

interface FakeOsc {
  type: OscillatorType;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeGain {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface FakeCtx {
  currentTime: number;
  createOscillator: () => FakeOsc;
  createGain: () => FakeGain;
}

function fakeAudioContext(): { ctx: FakeCtx; oscs: FakeOsc[]; gains: FakeGain[] } {
  const oscs: FakeOsc[] = [];
  const gains: FakeGain[] = [];
  const ctx: FakeCtx = {
    currentTime: 0,
    createOscillator() {
      const o: FakeOsc = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscs.push(o);
      return o;
    },
    createGain() {
      const g: FakeGain = {
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn().mockReturnThis(),
        disconnect: vi.fn(),
      };
      gains.push(g);
      return g;
    },
  };
  return { ctx, oscs, gains };
}

describe('MARCH_PITCHES_HZ', () => {
  it('has 4 pitches', () => {
    expect(MARCH_PITCHES_HZ).toHaveLength(4);
  });

  it('descends step by step', () => {
    for (let i = 1; i < MARCH_PITCHES_HZ.length; i++) {
      expect(MARCH_PITCHES_HZ[i]).toBeLessThan(MARCH_PITCHES_HZ[i - 1] as number);
    }
  });

  it('all pitches are within audible bass range (50-300Hz)', () => {
    for (const p of MARCH_PITCHES_HZ) {
      expect(p).toBeGreaterThan(50);
      expect(p).toBeLessThan(300);
    }
  });
});

describe('createInvaderMarchSynth', () => {
  it('first call fires, second call at same clock-time does not', () => {
    const { ctx, oscs } = fakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createInvaderMarchSynth(ctx as unknown as AudioContext, dest as unknown as AudioNode, clock);

    // First step always fires (lastTriggeredStep starts at -1, so any
    // currentStep value is "new"). This is intentional: the music
    // needs to start somewhere.
    expect(synth.step(55)).toBe(true);
    // Second call at the same clock time sees no progress, no fire.
    expect(synth.step(55)).toBe(false);
    expect(synth.step(55)).toBe(false);
    expect(oscs).toHaveLength(1);

    synth.dispose();
  });

  it('fires when the clock crosses a step boundary', () => {
    const { ctx, oscs } = fakeAudioContext();
    const dest = ctx.createGain();
    const clockSrc = { currentTime: 0 };
    const clock = new AudioClock(clockSrc, { stepInterval: () => 100 });
    const synth = createInvaderMarchSynth(ctx as unknown as AudioContext, dest as unknown as AudioNode, clock);

    // First step at currentTime=0 — clock.currentStep returns 0.
    // step(55) sees a new index (0 != -1) and fires.
    expect(synth.step(55)).toBe(true);
    expect(oscs).toHaveLength(1);

    // Same clock time, same step — no fire.
    expect(synth.step(55)).toBe(false);
    expect(oscs).toHaveLength(1);

    // Advance time to cross the next 100ms step boundary.
    clockSrc.currentTime = 0.15; // step = floor(0.15 / 0.1) = 1
    expect(synth.step(55)).toBe(true);
    expect(oscs).toHaveLength(2);

    synth.dispose();
  });

  it('cycles through the 4 march pitches', () => {
    const { ctx, oscs } = fakeAudioContext();
    const dest = ctx.createGain();
    const clockSrc = { currentTime: 0 };
    const clock = new AudioClock(clockSrc, { stepInterval: () => 100 });
    const synth = createInvaderMarchSynth(ctx as unknown as AudioContext, dest as unknown as AudioNode, clock);

    // 5 distinct clock-step crossings -> pitches 0, 1, 2, 3, 0 (wrap).
    for (let i = 0; i < 5; i++) {
      clockSrc.currentTime = i * 0.15;
      synth.step(55);
    }

    expect(oscs).toHaveLength(5);
    const expectedPitches = [
      MARCH_PITCHES_HZ[0],
      MARCH_PITCHES_HZ[1],
      MARCH_PITCHES_HZ[2],
      MARCH_PITCHES_HZ[3],
      MARCH_PITCHES_HZ[0], // wrap
    ];
    for (let i = 0; i < 5; i++) {
      const calls = oscs[i]!.frequency.setValueAtTime.mock.calls;
      expect(calls).toHaveLength(1);
      expect(calls[0]![0]).toBe(expectedPitches[i]);
    }

    synth.dispose();
  });

  it('uses square waves (chip-synth aesthetic, not pure sine)', () => {
    const { ctx, oscs } = fakeAudioContext();
    const dest = ctx.createGain();
    const clockSrc = { currentTime: 0 };
    const clock = new AudioClock(clockSrc, { stepInterval: () => 100 });
    const synth = createInvaderMarchSynth(ctx as unknown as AudioContext, dest as unknown as AudioNode, clock);

    synth.step(55);
    expect(oscs[0]!.type).toBe('square');

    synth.dispose();
  });

  it('schedules note-off via linearRampToValueAtTime (CR7)', () => {
    const { ctx, gains } = fakeAudioContext();
    const dest = ctx.createGain();
    const clockSrc = { currentTime: 0 };
    const clock = new AudioClock(clockSrc, { stepInterval: () => 100 });
    const synth = createInvaderMarchSynth(ctx as unknown as AudioContext, dest as unknown as AudioNode, clock);

    synth.step(55);
    // gains[0] = user-created dest, gains[1] = synth master,
    // gains[2] = per-note envelope gain.
    const noteGain = gains[2];
    expect(noteGain).toBeDefined();
    expect(noteGain!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      MARCH_NOTE_DURATION_MS / 1000,
    );

    synth.dispose();
  });

  it('dispose disconnects the master gain', () => {
    const { ctx, gains } = fakeAudioContext();
    const dest = ctx.createGain();
    const clockSrc = { currentTime: 0 };
    const clock = new AudioClock(clockSrc);
    const synth = createInvaderMarchSynth(ctx as unknown as AudioContext, dest as unknown as AudioNode, clock);
    synth.dispose();
    expect(gains[1]!.disconnect).toHaveBeenCalled();
  });
});
