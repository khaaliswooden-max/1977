// FR10 + FR11: UFO mystery ship.
//
// CONSTANTS POLICY (NFR21 / CR12 / Story 2.6):
// Saucer scoring (the 15-entry buggy cycle) and spawn cadence live
// in @/constants/computer-archeology. UFO_Y / UFO_SPEED / EDGE
// values here are visual-placement approximations.
//
// Collision detection between the player bullet and the UFO is a
// separate story (the game has no bullet-hit-target collision yet —
// see story 2.3 commit message).

import { SAUCER_SPAWN_INTERVAL_FRAMES } from '@/constants/computer-archeology';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState, Ufo } from '@/types/game';

export const UFO_Y = 32;
export const UFO_SPEED_PX_PER_TICK = 1;
export const UFO_SPAWN_COOLDOWN_FRAMES = SAUCER_SPAWN_INTERVAL_FRAMES;
export const UFO_LEFT_EDGE = 0;
export const UFO_RIGHT_EDGE = 224 - 16;

export function tickUfo(
  state: GameState,
  _input: unknown,
  _clock: Clock,
  events: GameEvent[],
): GameState {
  if (state.mode.kind !== 'playing') return state;

  let ufo: Ufo = state.ufo;

  if (ufo.active) {
    const dx = ufo.direction === 'right' ? UFO_SPEED_PX_PER_TICK : -UFO_SPEED_PX_PER_TICK;
    const newX = ufo.pos.x + dx;
    if (newX < UFO_LEFT_EDGE - 16 || newX > UFO_RIGHT_EDGE + 16) {
      ufo = { ...ufo, active: false, spawnCooldownFrames: UFO_SPAWN_COOLDOWN_FRAMES };
    } else {
      ufo = { ...ufo, pos: { x: newX, y: UFO_Y } };
    }
  } else {
    if (ufo.spawnCooldownFrames > 0) {
      ufo = { ...ufo, spawnCooldownFrames: ufo.spawnCooldownFrames - 1 };
    } else {
      // Spawn from left, deterministically (frame parity sets side).
      const fromLeft = state.frame % 2 === 0;
      ufo = {
        active: true,
        direction: fromLeft ? 'right' : 'left',
        pos: { x: fromLeft ? UFO_LEFT_EDGE : UFO_RIGHT_EDGE, y: UFO_Y },
        spawnCooldownFrames: 0,
      };
      events.push({ type: 'ufo_appeared' });
    }
  }

  if (ufo === state.ufo) return state;
  return { ...state, ufo };
}

