// Story 5.9: bullet ↔ target collision detection.
//
// Wires up the gap that's been open since story 1.15: turning all
// the placeholder bullet movement into actual gameplay events. Three
// collision passes per tick:
//
//   1. Player bullet vs alive invader → invader_killed
//   2. Player bullet vs active UFO    → ufo_killed (with cycle-table score)
//   3. Invader bullet vs alive player → player_killed
//
// AABB collision; sprite dimensions match what the scene rasterizer
// draws. The dimensions are chosen by us as visually reasonable
// placeholders, not extracted from ROM sprite data — the byte-exact
// sprite atlas is a follow-up story (post-v1).

import {
  SAUCER_SPAWN_INTERVAL_FRAMES,
  saucerScoreForHit,
} from '@/constants/computer-archeology';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState, Invader, InvaderBullet } from '@/types/game';
import type { InputSnapshot } from '@/types/input';

export const PLAYER_SPRITE_W = 16;
export const PLAYER_SPRITE_H = 8;
export const INVADER_SPRITE_W = 12;
export const INVADER_SPRITE_H = 8;
export const UFO_SPRITE_W = 16;
export const UFO_SPRITE_H = 8;
export const BULLET_W = 1;
export const BULLET_H = 4;

/**
 * Frames the player's death animation runs for before the
 * respawn-or-game-over decision in tickPlayer fires. ~1 second
 * at 60Hz.
 */
export const DEATH_ANIMATION_FRAMES = 60;

function aabbHit(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function tickCollisions(
  state: GameState,
  _input: InputSnapshot,
  _clock: Clock,
  events: GameEvent[],
): GameState {
  if (state.mode.kind !== 'playing') return state;

  let s = state;

  // 1. Player bullet vs alive invader.
  if (s.playerBullet) {
    const pb = s.playerBullet;
    let hitInvader: Invader | null = null;
    for (const inv of s.invaders) {
      if (!inv.alive) continue;
      if (
        aabbHit(
          pb.pos.x,
          pb.pos.y,
          BULLET_W,
          BULLET_H,
          inv.pos.x,
          inv.pos.y,
          INVADER_SPRITE_W,
          INVADER_SPRITE_H,
        )
      ) {
        hitInvader = inv;
        break;
      }
    }
    if (hitInvader) {
      events.push({
        type: 'invader_killed',
        row: hitInvader.row,
        col: hitInvader.col,
      });
      s = {
        ...s,
        playerBullet: null,
        invaders: s.invaders.map((i) =>
          i === hitInvader ? { ...i, alive: false, killedAtFrame: s.frame } : i,
        ),
      };
    }
  }

  // 2. Player bullet vs active UFO.
  if (s.playerBullet && s.ufo.active) {
    const pb = s.playerBullet;
    if (
      aabbHit(
        pb.pos.x,
        pb.pos.y,
        BULLET_W,
        BULLET_H,
        s.ufo.pos.x,
        s.ufo.pos.y,
        UFO_SPRITE_W,
        UFO_SPRITE_H,
      )
    ) {
      const score = saucerScoreForHit(s.saucerHits + 1);
      events.push({ type: 'ufo_killed', score });
      s = {
        ...s,
        playerBullet: null,
        ufo: {
          ...s.ufo,
          active: false,
          spawnCooldownFrames: SAUCER_SPAWN_INTERVAL_FRAMES,
        },
      };
    }
  }

  // 3. Invader bullet vs alive player. Death-animation frames > 0
  //    means the player is mid-death; don't trigger another kill.
  if (
    s.player.alive &&
    s.player.deathAnimationFrames === 0 &&
    s.invaderBullets.length > 0
  ) {
    const survivors: InvaderBullet[] = [];
    let hit = false;
    for (const ib of s.invaderBullets) {
      if (
        !hit &&
        aabbHit(
          ib.pos.x,
          ib.pos.y,
          BULLET_W,
          BULLET_H,
          s.player.pos.x,
          s.player.pos.y,
          PLAYER_SPRITE_W,
          PLAYER_SPRITE_H,
        )
      ) {
        hit = true;
      } else {
        survivors.push(ib);
      }
    }
    if (hit) {
      events.push({ type: 'player_killed' });
      s = {
        ...s,
        invaderBullets: survivors,
        player: {
          ...s.player,
          alive: false,
          deathAnimationFrames: DEATH_ANIMATION_FRAMES,
        },
      };
    }
  }

  return s;
}
