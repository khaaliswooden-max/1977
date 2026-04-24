import { describe, expect, it } from 'vitest';
import { AudioClock } from '@/audio/clock';
import {
  SHOOT_DURATION_MS,
  SHOOT_END_HZ,
  SHOOT_START_HZ,
  createShootSynth,
} from '@/audio/synth/shoot';
import { makeFakeAudioContext } from '@/audio/synth/_test-helpers';

describe('createShootSynth', () => {
  it('fires a square-wave oscillator on fire()', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0.5 });
    const synth = createShootSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    expect(oscs).toHaveLength(1);
    expect(oscs[0]!.type).toBe('square');
    synth.dispose();
  });

  it('sweeps frequency from SHOOT_START_HZ down to SHOOT_END_HZ', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 1.0 });
    const synth = createShootSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    const osc = oscs[0]!;
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(SHOOT_START_HZ, 1.0);
    expect(osc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(
      SHOOT_END_HZ,
      1.0 + SHOOT_DURATION_MS / 1000,
    );
    synth.dispose();
  });

  it('schedules note-off via linearRampToValueAtTime (CR7)', () => {
    const { ctx, gains } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createShootSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    // gains[0]=dest, gains[1]=master, gains[2]=note envelope.
    expect(gains[2]!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      SHOOT_DURATION_MS / 1000,
    );
    synth.dispose();
  });

  it('multiple fires create independent oscillators', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createShootSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    synth.fire();
    synth.fire();
    expect(oscs).toHaveLength(3);
    synth.dispose();
  });
});
