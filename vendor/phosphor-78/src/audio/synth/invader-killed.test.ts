import { describe, expect, it } from 'vitest';
import { AudioClock } from '@/audio/clock';
import {
  INVADER_KILLED_DURATION_MS,
  INVADER_KILLED_FILTER_HZ,
  createInvaderKilledSynth,
} from '@/audio/synth/invader-killed';
import { makeFakeAudioContext } from '@/audio/synth/_test-helpers';

describe('createInvaderKilledSynth', () => {
  it('uses noise + highpass filter (brighter than the explosion)', () => {
    const { ctx, bufferSources, filters } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0 });
    const synth = createInvaderKilledSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    expect(bufferSources).toHaveLength(1);
    expect(filters).toHaveLength(1);
    expect(filters[0]!.type).toBe('highpass');
    expect(filters[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(
      INVADER_KILLED_FILTER_HZ,
      0,
    );
    synth.dispose();
  });

  it('is shorter than the explosion (per design)', () => {
    expect(INVADER_KILLED_DURATION_MS).toBeLessThan(150);
  });

  it('schedules note-off via linearRampToValueAtTime (CR7)', () => {
    const { ctx, gains } = makeFakeAudioContext();
    const dest = ctx.createGain();
    const clock = new AudioClock({ currentTime: 0.5 });
    const synth = createInvaderKilledSynth(
      ctx as unknown as AudioContext,
      dest as unknown as AudioNode,
      clock,
    );
    synth.fire();
    expect(gains[2]!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      0.5 + INVADER_KILLED_DURATION_MS / 1000,
    );
    synth.dispose();
  });
});
