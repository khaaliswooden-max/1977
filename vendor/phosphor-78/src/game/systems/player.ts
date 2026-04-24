// FR1, FR2, ADR-005, N3: player movement + firing.
//
// CONSTANTS POLICY (NFR21 / CR12 / Story 2.6):
// ROM-derived 1:1 constants live in @/constants/computer-archeology.
// The values below (boundary x, y placement, bullet velocity) are
// visual-placement approximations not directly traceable to ROM.
// Pure sub-reducer following the SubReducer signature in reducer.ts.
// All coordinates are in 224x256 logical pixel space.

import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { Bullet, GameState, Player } from '@/types/game';
import type { InputSnapshot } from '@/types/input';

// Player ship is 16 wide. Logical framebuffer is 224 wide. Margins
// of 8 pixels on each side keep the sprite away from the screen
// edges.
export const PLAYER_MIN_X = 8;
export const PLAYER_MAX_X = 224 - 16 - 8;
export const PLAYER_Y = 216;
export const PLAYER_SPEED_PX_PER_TICK = 1;
// Player bullet starts above the ship's center and moves up at this
// rate per tick. Refined by story 2.x against the original.
export const PLAYER_BULLET_SPEED_PX_PER_TICK = -4;

export function tickPlayer(
  state: GameState,
  input: InputSnapshot,
  _clock: Clock,
  events: GameEvent[],
): GameState {
  if (state.mode.kind !== 'playing') return state;

  // Death-animation countdown + respawn / game-over handoff.
  // Story 5.9: when collisions sets alive=false + deathAnimationFrames>0,
  // tickPlayer is the place that decrements the timer and decides
  // whether to respawn (lives > 0) or stay dead so tickWave can
  // trigger game_over (lives <= 0).
  if (!state.player.alive) {
    if (state.player.deathAnimationFrames > 0) {
      const next = state.player.deathAnimationFrames - 1;
      if (next > 0) {
        return {
          ...state,
          player: { ...state.player, deathAnimationFrames: next },
        };
      }
      // Animation just expired this tick — lose a life and decide.
      const newLives = state.lives - 1;
      if (newLives > 0) {
        return {
          ...state,
          lives: newLives,
          player: {
            ...state.player,
            alive: true,
            pos: { x: 16, y: PLAYER_Y },
            deathAnimationFrames: 0,
          },
        };
      }
      // Out of lives — stay dead. tickWave will see (lives==0,
      // deathAnimationFrames==0) and emit game_over.
      return {
        ...state,
        lives: 0,
        player: { ...state.player, deathAnimationFrames: 0 },
      };
    }
    return state;
  }

  let { x } = state.player.pos;
  if (input.left && !input.right) {
    x = Math.max(PLAYER_MIN_X, x - PLAYER_SPEED_PX_PER_TICK);
  } else if (input.right && !input.left) {
    x = Math.min(PLAYER_MAX_X, x + PLAYER_SPEED_PX_PER_TICK);
  }

  let player: Player = state.player;
  if (x !== player.pos.x) {
    player = { ...player, pos: { x, y: PLAYER_Y } };
  }

  let playerBullet = state.playerBullet;
  if (input.fire && playerBullet === null) {
    const bullet: Bullet = {
      id: `pb_${state.frame}`,
      pos: { x: player.pos.x + 7, y: PLAYER_Y - 4 },
      velocity: { x: 0, y: PLAYER_BULLET_SPEED_PX_PER_TICK },
    };
    playerBullet = bullet;
    player = { ...player, shotsFired: player.shotsFired + 1 };
    events.push({ type: 'player_shoot' });
  }

  if (player === state.player && playerBullet === state.playerBullet) {
    return state;
  }
  return { ...state, player, playerBullet };
}
