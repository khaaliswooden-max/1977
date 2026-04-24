// NFR11 + NFR15 + ADR-002: 4-step march loop driven by AudioClock.
//
// The original 1978 march cycles through 4 falling pitches and
// speeds up as aliens die (Code.html:3937). Tempo is dictated by
// the table at $1A11/$1A21 (already in computer-archeology.ts as
// MARCH_TEMPO_TABLE; AudioClock.currentStep already uses it).
//
// What this module does: when called by the main loop on a frame
// where the audio clock crossed a step boundary (i.e. currentStep()
// changed), schedule the next pitch into the AudioContext at a
// sample-accurate offset and bump the 4-step phase.

import type { AudioClock } from '@/audio/clock';

/**
 * Approximate pitches for the 4 march steps in Hz. The original
 * uses the SN76477 with custom external timing components, so the
 * actual frequencies are not in any disassembled table — they're
 * an emergent property of the analog circuit. These four values
 * are derived from spectrum analysis of the reference recording
 * and round to musical-ish frequencies for clarity.
 *
 * Story 3.6 will refine these against the spectrum-regression
 * threshold X (audio-thresholds.json).
 */
export const MARCH_PITCHES_HZ: readonly number[] = [
  130.81, // step 0 — C3
  123.47, // step 1 — B2
  116.54, // step 2 — A#2
  110.0, // step 3 — A2
];

export const MARCH_NOTE_DURATION_MS = 60;
export const MARCH_VOLUME = 0.25;

export interface InvaderMarchSynth {
  /**
   * Try to advance one march step if the clock says it's time.
   * Returns true if a note was scheduled, false otherwise.
   */
  step(remainingInvaders: number): boolean;
  dispose(): void;
}

/**
 * Build a march synth bound to a destination node + audio clock.
 * The synth maintains its own running step counter; the main loop
 * just calls step(N) every frame and the synth decides whether to
 * fire based on clock progress.
 */
export function createInvaderMarchSynth(
  ctx: AudioContext,
  destination: AudioNode,
  clock: AudioClock,
): InvaderMarchSynth {
  let stepIdx = 0;
  let lastTriggeredStep = -1;
  const master = ctx.createGain();
  master.gain.setValueAtTime(MARCH_VOLUME, ctx.currentTime);
  master.connect(destination);

  function fireNote(pitchHz: number): void {
    const now = clock.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitchHz, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.linearRampToValueAtTime(0, now + MARCH_NOTE_DURATION_MS / 1000);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + MARCH_NOTE_DURATION_MS / 1000 + 0.05);
  }

  return {
    step(remainingInvaders) {
      const cur = clock.currentStep(remainingInvaders);
      if (cur === lastTriggeredStep) return false;
      lastTriggeredStep = cur;
      const pitch = MARCH_PITCHES_HZ[stepIdx % MARCH_PITCHES_HZ.length] ?? 110;
      fireNote(pitch);
      stepIdx = (stepIdx + 1) % MARCH_PITCHES_HZ.length;
      return true;
    },
    dispose() {
      master.disconnect();
    },
  };
}
