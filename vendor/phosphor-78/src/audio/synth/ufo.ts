// NFR9 + NFR10: UFO traversal sound — the iconic warbling glide.
//
// Two oscillators detuned by ~10 Hz, both modulated by a slow LFO
// to produce the characteristic wobble. The pair beats against
// each other to give the "alien spaceship" feel without needing
// FM synthesis.
//
// Story 3.6 will tighten the parameters against the spectrum
// regression baseline; the values here are chosen by ear from
// playing the reference recording.

import type { AudioClock } from '@/audio/clock';

export const UFO_BASE_HZ = 350;
export const UFO_DETUNE_HZ = 10;
export const UFO_LFO_HZ = 8;
export const UFO_LFO_DEPTH_HZ = 60;
export const UFO_VOLUME = 0.18;

export interface UfoSynth {
  /** Start the warbling glide. Idempotent if already playing. */
  start(): void;
  /** Stop the glide (used when the UFO leaves the screen). */
  stop(): void;
  dispose(): void;
}

export function createUfoSynth(
  ctx: AudioContext,
  destination: AudioNode,
  clock: AudioClock,
): UfoSynth {
  const master = ctx.createGain();
  master.gain.setValueAtTime(UFO_VOLUME, ctx.currentTime);
  master.connect(destination);

  // Internal node graph stays disposed-and-rebuilt per start() so
  // we don't have to track playing state across many invocations.
  let active: {
    oscA: OscillatorNode;
    oscB: OscillatorNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    noteGain: GainNode;
  } | null = null;

  function build(): void {
    const now = clock.currentTime;
    const noteGain = ctx.createGain();
    noteGain.gain.setValueAtTime(0.6, now);
    noteGain.connect(master);

    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.setValueAtTime(UFO_BASE_HZ, now);
    const oscB = ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscB.frequency.setValueAtTime(UFO_BASE_HZ + UFO_DETUNE_HZ, now);

    // LFO modulates BOTH oscillators by feeding into a gain that
    // routes into their .frequency AudioParams. setValueAtTime
    // initializes the LFO at zero crossing.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(UFO_LFO_HZ, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(UFO_LFO_DEPTH_HZ, now);
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);

    oscA.connect(noteGain);
    oscB.connect(noteGain);
    oscA.start(now);
    oscB.start(now);
    lfo.start(now);

    active = { oscA, oscB, lfo, lfoGain, noteGain };
  }

  return {
    start() {
      if (active) return;
      build();
    },
    stop() {
      if (!active) return;
      const now = clock.currentTime;
      // Quick fade so the cutoff isn't a click. CR7-compliant.
      active.noteGain.gain.linearRampToValueAtTime(0, now + 0.05);
      const a = active;
      active = null;
      // Stop oscillators after the fade is done.
      a.oscA.stop(now + 0.06);
      a.oscB.stop(now + 0.06);
      a.lfo.stop(now + 0.06);
    },
    dispose() {
      if (active) {
        active.oscA.stop();
        active.oscB.stop();
        active.lfo.stop();
        active = null;
      }
      master.disconnect();
    },
  };
}
