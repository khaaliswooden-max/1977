import { describe, expect, it } from 'vitest';
import { AudioClock } from '@/audio/clock';
import {
  UFO_BASE_HZ,
  UFO_DETUNE_HZ,
  UFO_LFO_HZ,
  createUfoSynth,
} from '@/audio/synth/ufo';
import { makeFakeAudioContext } from '@/audio/synth/_test-helpers';

describe('createUfoSynth', () => {
  it('start() builds two detuned sawtooths + one LFO', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.start();
    // 2 sawtooths + 1 sine LFO = 3 oscillators.
    expect(oscs).toHaveLength(3);
    expect(oscs[0]!.type).toBe('sawtooth');
    expect(oscs[1]!.type).toBe('sawtooth');
    expect(oscs[2]!.type).toBe('sine');
    synth.stop();
    synth.dispose();
  });

  it('detunes oscillator B by UFO_DETUNE_HZ', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.start();
    expect(oscs[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(UFO_BASE_HZ, 0);
    expect(oscs[1]!.frequency.setValueAtTime).toHaveBeenCalledWith(
      UFO_BASE_HZ + UFO_DETUNE_HZ,
      0,
    );
    synth.stop();
    synth.dispose();
  });

  it('LFO is at UFO_LFO_HZ and is the third oscillator', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.start();
    expect(oscs[2]!.frequency.setValueAtTime).toHaveBeenCalledWith(UFO_LFO_HZ, 0);
    synth.stop();
    synth.dispose();
  });

  it('start() is idempotent (no extra nodes on re-start)', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.start();
    synth.start();
    synth.start();
    expect(oscs).toHaveLength(3);
    synth.stop();
    synth.dispose();
  });

  it('stop() ramps gain to 0 (CR7)', () => {
    const { ctx, gains } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0.5 });
    const synth = createUfoSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.start();
    synth.stop();
    // gains[0]=dest, gains[1]=master, gains[2]=note, gains[3]=lfoGain.
    expect(gains[2]!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      0.5 + 0.05,
    );
    synth.dispose();
  });

  it('stop() before start() is a no-op', () => {
    const { ctx, gains } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.stop();
    // Only the synth's master gain should exist (gains[1]); no
    // note gain or LFO gain should have been created.
    expect(gains).toHaveLength(2); // dest + master
    synth.dispose();
  });
});
