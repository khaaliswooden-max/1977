// NFR9 + NFR10 + AR9: invader-killed (the small "splat" sound).
//
// A quick noise burst, much shorter and brighter than the player
// explosion. Recognizable as the per-alien hit feedback.

import type { AudioClock } from '@/audio/clock';

// Story 5.15: bumped duration 80→120ms and lowered the highpass
// cutoff 3000→2000Hz so the kill sound has a touch more body.
// 80ms / 3kHz felt like a sharp click; users weren't sure they
// heard anything at all. Still distinctly shorter than the
// player-explosion (300ms) and ufo-killed (180ms) sounds.
export const INVADER_KILLED_DURATION_MS = 120;
export const INVADER_KILLED_VOLUME = 0.45;
export const INVADER_KILLED_FILTER_HZ = 2000;

export interface InvaderKilledSynth {
  fire(): void;
  dispose(): void;
}

function buildNoiseBuffer(ctx: AudioContext, durationMs: number): AudioBuffer {
  const samples = Math.max(1, Math.round((durationMs / 1000) * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Different LFSR seed than the explosion synth so the two
  // sounds aren't mathematically identical when their durations
  // overlap.
  let lfsr = 0xbeef;
  for (let i = 0; i < samples; i++) {
    const lsb = lfsr & 1;
    lfsr >>>= 1;
    if (lsb) lfsr ^= 0xb400;
    data[i] = (lfsr & 0xffff) / 0x8000 - 1;
  }
  return buffer;
}

export function createInvaderKilledSynth(
  ctx: AudioContext,
  destination: AudioNode,
  clock: AudioClock,
): InvaderKilledSynth {
  const master = ctx.createGain();
  master.gain.setValueAtTime(INVADER_KILLED_VOLUME, ctx.currentTime);
  master.connect(destination);
  const noiseBuffer = buildNoiseBuffer(ctx, INVADER_KILLED_DURATION_MS);

  return {
    fire() {
      const now = clock.currentTime;
      const dur = INVADER_KILLED_DURATION_MS / 1000;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(INVADER_KILLED_FILTER_HZ, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      src.connect(filter).connect(gain).connect(master);
      src.start(now);
      src.stop(now + dur);
    },
    dispose() {
      master.disconnect();
    },
  };
}
