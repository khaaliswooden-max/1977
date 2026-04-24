import { describe, expect, it } from 'vitest';
import { AudioClock } from '@/audio/clock';
import {
  UFO_KILLED_DURATION_MS,
  UFO_KILLED_NOISE_FILTER_HZ,
  UFO_KILLED_PULSE_END_HZ,
  UFO_KILLED_PULSE_START_HZ,
  createUfoKilledSynth,
} from '@/audio/synth/ufo-killed';
import { EXPLOSION_DURATION_MS } from '@/audio/synth/explosion';
import { makeFakeAudioContext } from '@/audio/synth/_test-helpers';

describe('createUfoKilledSynth', () => {
  it('mixes a noise source with a tonal pulse oscillator', () => {
    const { ctx, oscs, bufferSources, filters } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoKilledSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    expect(bufferSources).toHaveLength(1);
    expect(oscs).toHaveLength(1);
    expect(filters).toHaveLength(1);
    expect(filters[0]!.type).toBe('bandpass');
    expect(filters[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(
      UFO_KILLED_NOISE_FILTER_HZ,
      0,
    );
    synth.dispose();
  });

  it('pulse oscillator sweeps DOWN', () => {
    const { ctx, oscs } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createUfoKilledSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    expect(oscs[0]!.type).toBe('square');
    expect(oscs[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(
      UFO_KILLED_PULSE_START_HZ,
      0,
    );
    expect(oscs[0]!.frequency.linearRampToValueAtTime).toHaveBeenCalled();
    synth.dispose();
  });

  it('is shorter than the player explosion (per design)', () => {
    expect(UFO_KILLED_DURATION_MS).toBeLessThan(EXPLOSION_DURATION_MS);
  });

  it('start frequency higher than end frequency', () => {
    expect(UFO_KILLED_PULSE_START_HZ).toBeGreaterThan(UFO_KILLED_PULSE_END_HZ);
  });
});
