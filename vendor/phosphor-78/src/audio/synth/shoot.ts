// NFR9 + NFR10 + AR9: player-shoot synth.
//
// A descending square-wave chirp — short, percussive, recognizably
// "pew". Spectrum-baseline tightening lives in story 3.6.

import type { AudioClock } from '@/audio/clock';

export const SHOOT_START_HZ = 1200;
export const SHOOT_END_HZ = 200;
export const SHOOT_DURATION_MS = 80;
export const SHOOT_VOLUME = 0.3;

export interface ShootSynth {
  fire(): void;
  dispose(): void;
}

export function createShootSynth(
  ctx: AudioContext,
  destination: AudioNode,
  clock: AudioClock,
): ShootSynth {
  const master = ctx.createGain();
  master.gain.setValueAtTime(SHOOT_VOLUME, ctx.currentTime);
  master.connect(destination);

  return {
    fire() {
      const now = clock.currentTime;
      const dur = SHOOT_DURATION_MS / 1000;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(SHOOT_START_HZ, now);
      // Linear sweep down — sounds steeper to the ear than it
      // looks because pitch perception is logarithmic.
      osc.frequency.linearRampToValueAtTime(SHOOT_END_HZ, now + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.linearRampToValueAtTime(0, now + dur);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + dur + 0.05);
    },
    dispose() {
      master.disconnect();
    },
  };
}
