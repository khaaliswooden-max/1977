// NFR9 + NFR10 + AR9 + AR11: player-killed (explosion) synth.
//
// Filtered LFSR-driven noise burst with a heavy attack and
// medium decay. The LFSR (not Math.random) keeps it deterministic
// for the spectrum regression in story 3.6.

import type { AudioClock } from '@/audio/clock';

export const EXPLOSION_DURATION_MS = 300;
export const EXPLOSION_VOLUME = 0.5;
export const EXPLOSION_FILTER_START_HZ = 1500;
export const EXPLOSION_FILTER_END_HZ = 200;

export interface ExplosionSynth {
  fire(): void;
  dispose(): void;
}

/**
 * Build a deterministic noise buffer using the same Galois LFSR
 * the SN76477 oscillator uses. Same seed every call -> same
 * buffer (predictable output for tests).
 */
function buildNoiseBuffer(ctx: AudioContext, durationMs: number): AudioBuffer {
  const samples = Math.max(1, Math.round((durationMs / 1000) * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lfsr = 0xace1;
  for (let i = 0; i < samples; i++) {
    const lsb = lfsr & 1;
    lfsr >>>= 1;
    if (lsb) lfsr ^= 0xb400;
    data[i] = (lfsr & 0xffff) / 0x8000 - 1;
  }
  return buffer;
}

export function createExplosionSynth(
  ctx: AudioContext,
  destination: AudioNode,
  clock: AudioClock,
): ExplosionSynth {
  const master = ctx.createGain();
  master.gain.setValueAtTime(EXPLOSION_VOLUME, ctx.currentTime);
  master.connect(destination);
  // Cache the noise buffer so each fire reuses the same data.
  const noiseBuffer = buildNoiseBuffer(ctx, EXPLOSION_DURATION_MS);

  return {
    fire() {
      const now = clock.currentTime;
      const dur = EXPLOSION_DURATION_MS / 1000;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(EXPLOSION_FILTER_START_HZ, now);
      filter.frequency.linearRampToValueAtTime(EXPLOSION_FILTER_END_HZ, now + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
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
