// NFR9 + NFR10: UFO killed — noise burst with a short tonal pulse.
//
// Mixes filtered noise (similar to the explosion but shorter and
// brighter) with a quick descending square pulse, suggesting the
// UFO breaking apart with a small "kreee".

import type { AudioClock } from '@/audio/clock';

export const UFO_KILLED_DURATION_MS = 180;
export const UFO_KILLED_VOLUME = 0.4;
export const UFO_KILLED_PULSE_START_HZ = 800;
export const UFO_KILLED_PULSE_END_HZ = 200;
export const UFO_KILLED_NOISE_FILTER_HZ = 2000;

export interface UfoKilledSynth {
  fire(): void;
  dispose(): void;
}

function buildNoiseBuffer(ctx: AudioContext, durationMs: number): AudioBuffer {
  const samples = Math.max(1, Math.round((durationMs / 1000) * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Yet another LFSR seed so this is bit-distinct from the player
  // explosion and the per-alien hit.
  let lfsr = 0xcafe;
  for (let i = 0; i < samples; i++) {
    const lsb = lfsr & 1;
    lfsr >>>= 1;
    if (lsb) lfsr ^= 0xb400;
    data[i] = (lfsr & 0xffff) / 0x8000 - 1;
  }
  return buffer;
}

export function createUfoKilledSynth(
  ctx: AudioContext,
  destination: AudioNode,
  clock: AudioClock,
): UfoKilledSynth {
  const master = ctx.createGain();
  master.gain.setValueAtTime(UFO_KILLED_VOLUME, ctx.currentTime);
  master.connect(destination);
  const noiseBuffer = buildNoiseBuffer(ctx, UFO_KILLED_DURATION_MS);

  return {
    fire() {
      const now = clock.currentTime;
      const dur = UFO_KILLED_DURATION_MS / 1000;

      // Noise side.
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(UFO_KILLED_NOISE_FILTER_HZ, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.linearRampToValueAtTime(0, now + dur);
      noiseSrc.connect(noiseFilter).connect(noiseGain).connect(master);
      noiseSrc.start(now);
      noiseSrc.stop(now + dur);

      // Pulse side: a steeper descending square that gives the
      // "the UFO went down" feel.
      const pulseDur = Math.min(dur, 0.08);
      const pulseOsc = ctx.createOscillator();
      pulseOsc.type = 'square';
      pulseOsc.frequency.setValueAtTime(UFO_KILLED_PULSE_START_HZ, now);
      pulseOsc.frequency.linearRampToValueAtTime(
        UFO_KILLED_PULSE_END_HZ,
        now + pulseDur,
      );
      const pulseGain = ctx.createGain();
      pulseGain.gain.setValueAtTime(0.4, now);
      pulseGain.gain.linearRampToValueAtTime(0, now + pulseDur);
      pulseOsc.connect(pulseGain).connect(master);
      pulseOsc.start(now);
      pulseOsc.stop(now + pulseDur + 0.05);
    },
    dispose() {
      master.disconnect();
    },
  };
}
