// FR17, FR18, FR19, FR20: wave progression and game-over conditions.

import { makeInitialFormation } from '@/game/systems/invaders';
import { makeInitialShields } from '@/game/systems/shields';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';

// Story 5.11: lowered from 200 → 208 so aliens have to actually
// reach the player's row instead of triggering game-over while
// they're still mid-shield (shields span y=192..208). With
// invader sprite height 8, top=208 means the alien's bottom
// edge touches the player's top edge (player at y=216).
export const GAME_OVER_INVADER_Y = 208;

export function tickWave(
  state: GameState,
  _input: unknown,
  _clock: Clock,
  events: GameEvent[],
): GameState {
  if (state.mode.kind !== 'playing') return state;

  const aliveCount = state.invaders.reduce(
    (n, inv) => (inv.alive ? n + 1 : n),
    0,
  );

  // Game over: any alive invader has reached the player line.
  for (const inv of state.invaders) {
    if (inv.alive && inv.pos.y >= GAME_OVER_INVADER_Y) {
      events.push({ type: 'game_over' });
      return {
        ...state,
        mode: { kind: 'gameover', finalScore: state.score },
      };
    }
  }

  // Game over: lives exhausted and player not currently mid-death.
  if (state.lives <= 0 && state.player.deathAnimationFrames === 0) {
    events.push({ type: 'game_over' });
    return {
      ...state,
      mode: { kind: 'gameover', finalScore: state.score },
    };
  }

  // Wave clear: no alive invaders. Reset positions, keep score+lives.
  if (aliveCount === 0 && state.invaders.length > 0) {
    const wave = state.mode.wave + 1;
    events.push({ type: 'wave_cleared', wave });
    return {
      ...state,
      mode: { kind: 'playing', wave },
      invaders: makeInitialFormation(),
      shields: makeInitialShields(),
      invaderBullets: [],
      playerBullet: null,
      invaderDirection: 'right',
    };
  }

  return state;
}
