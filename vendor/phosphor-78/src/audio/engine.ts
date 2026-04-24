// Audio engine wiring all per-event synths into a single dispatch
// surface. The main loop forwards GameEvent[] here once per frame;
// each event triggers (or starts/stops) the corresponding synth.
//
// Story 3.6 — replaces the M1 placeholder OscillatorNode beeps with
// the proper synth modules (story 3.3-3.5). The placeholder factory
// is kept as `createPlaceholderAudioEngine` for any consumer that
// wants the lighter-weight version (none in production today).

import type { AudioClock } from '@/audio/clock';
import { createExplosionSynth } from '@/audio/synth/explosion';
import { createInvaderKilledSynth } from '@/audio/synth/invader-killed';
import { createInvaderMarchSynth } from '@/audio/synth/invader-march';
import { createShootSynth } from '@/audio/synth/shoot';
import { createUfoSynth } from '@/audio/synth/ufo';
import { createUfoKilledSynth } from '@/audio/synth/ufo-killed';
import type { GameEvent } from '@/types/audio';

export interface AudioEngine {
  /** Consume reducer-emitted events and trigger the matching synths. */
  handle(events: readonly GameEvent[]): void;
  /**
   * Per-frame tick — drives synths that need to know about clock
   * progress (invader march fires only when the clock crosses a
   * step; UFO drone keeps running until the UFO leaves).
   */
  tick(state: { remainingInvaders: number; ufoActive: boolean }): void;
  dispose(): void;
}

export function createAudioEngine(
  ctx: AudioContext,
  clock: AudioClock,
): AudioEngine {
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.6, ctx.currentTime);
  master.connect(ctx.destination);

  const shoot = createShootSynth(ctx, master, clock);
  const explosion = createExplosionSynth(ctx, master, clock);
  const invaderKilled = createInvaderKilledSynth(ctx, master, clock);
  const ufo = createUfoSynth(ctx, master, clock);
  const ufoKilled = createUfoKilledSynth(ctx, master, clock);
  const march = createInvaderMarchSynth(ctx, master, clock);

  return {
    handle(events) {
      for (const e of events) {
        switch (e.type) {
          case 'player_shoot':
            shoot.fire();
            break;
          case 'invader_killed':
            invaderKilled.fire();
            break;
          case 'player_killed':
            explosion.fire();
            break;
          case 'ufo_appeared':
            // Drone start is handled in tick() based on game state;
            // the appeared event is informational.
            break;
          case 'ufo_killed':
            ufo.stop();
            ufoKilled.fire();
            break;
          case 'wave_cleared':
            ufo.stop();
            break;
          case 'game_over':
            ufo.stop();
            explosion.fire();
            break;
          case 'extra_life':
            shoot.fire();
            break;
        }
      }
    },
    tick(state) {
      // Keep the UFO drone in sync with the game's UFO state.
      if (state.ufoActive) ufo.start();
      else ufo.stop();
      // Advance the march clock — only fires when a step boundary
      // is crossed.
      if (state.remainingInvaders > 0) march.step(state.remainingInvaders);
    },
    dispose() {
      shoot.dispose();
      explosion.dispose();
      invaderKilled.dispose();
      ufo.dispose();
      ufoKilled.dispose();
      march.dispose();
      master.disconnect();
    },
  };
}

/**
 * Legacy placeholder — kept for any caller still importing this name
 * (none in production). Just delegates to the real engine.
 */
export const createPlaceholderAudioEngine = createAudioEngine;
