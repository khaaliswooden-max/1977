// FR21 + FR4: title screen with TAITO 1978 attribution; Enter starts
// a new game. Story 5.10 fix: gameover + Enter restarts directly,
// and both transition paths fully reset the player + UFO so a fresh
// playing state really is fresh.

import { makeInitialFormation } from '@/game/systems/invaders';
import { makeInitialShields } from '@/game/systems/shields';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';
import type { InputSnapshot } from '@/types/input';

/** Set true to render the attribution overlay on the title screen. */
export const SHOW_TAITO_ATTRIBUTION = true;
export const TAITO_ATTRIBUTION_TEXT = '\u00a9 1978 TAITO CORPORATION';
export const HOMAGE_NOTICE = 'Phosphor 78 is an unofficial study piece.';

/** Position to put the player when (re)starting a wave. */
const PLAYER_START_X = 16;
const PLAYER_START_Y = 216;

function freshPlayingState(prev: GameState, wave: number): GameState {
  return {
    ...prev,
    mode: { kind: 'playing', wave },
    invaders: makeInitialFormation(),
    invaderDirection: 'right',
    invaderBullets: [],
    playerBullet: null,
    shields: makeInitialShields(),
    score: 0,
    lives: 3,
    extraLifeAt: 1500,
    saucerHits: 0,
    ufo: {
      active: false,
      pos: { x: 0, y: 32 },
      direction: 'left',
      spawnCooldownFrames: 0,
    },
    player: {
      pos: { x: PLAYER_START_X, y: PLAYER_START_Y },
      alive: true,
      deathAnimationFrames: 0,
      shotsFired: 0,
    },
  };
}

/**
 * Title-screen reducer. Handles the two confirm transitions:
 *   • title    + Enter → fresh playing state
 *   • gameover + Enter → fresh playing state (skip the title bounce
 *     so a single key press restarts a round)
 *
 * Pure: returns the same state object reference if no transition.
 */
export function tickTitle(
  state: GameState,
  input: InputSnapshot,
  _clock: Clock,
  _events: GameEvent[],
): GameState {
  if (
    (state.mode.kind === 'title' || state.mode.kind === 'gameover') &&
    input.confirm
  ) {
    return freshPlayingState(state, 1);
  }
  return state;
}
