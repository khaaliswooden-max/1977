// FR9 (story 2.2 — behaviorally 1:1 with the disassembly):
//
// Three invader-shot kinds (rolling / plunger / squiggly), time-
// multiplexed by a 3-state cycle counter so at most one new shot
// is fired each spawn check. Rolling shot column-targets the
// player. Plunger is disabled when only 1 alien remains. Each shot
// has a 4-frame sprite animation. Trajectories: rolling and plunger
// fall straight; squiggly weaves left-right with a deterministic
// sine-driven offset.
//
// Source citations live in src/constants/computer-archeology.ts.

import {
  ALIEN_SHOT_ANIMATION_FRAMES,
  ALIEN_SHOT_CYCLE,
  ALIEN_SHOT_SPEED_PX_PER_TICK,
  PLUNGER_DISABLED_AT_ALIVE,
  type AlienShotKind,
} from '@/constants/computer-archeology';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type {
  Bullet,
  GameState,
  Invader,
  InvaderBullet,
} from '@/types/game';

export const MAX_INVADER_BULLETS = 3;
export const INVADER_FIRE_INTERVAL_FRAMES = 45;
export const SCREEN_BOTTOM_Y = 256;
export const SQUIGGLY_AMPLITUDE_PX = 4;
export const SQUIGGLY_PERIOD_FRAMES = 16;

export function tickBullets(
  state: GameState,
  _input: unknown,
  _clock: Clock,
  _events: GameEvent[],
): GameState {
  if (state.mode.kind !== 'playing') return state;

  // 1. Advance player bullet, drop if off-screen.
  let playerBullet: Bullet | null = state.playerBullet;
  if (playerBullet) {
    const newY = playerBullet.pos.y + playerBullet.velocity.y;
    if (newY < 0) {
      playerBullet = null;
    } else {
      playerBullet = {
        ...playerBullet,
        pos: { x: playerBullet.pos.x, y: newY },
      };
    }
  }

  // 2. Advance invader bullets per their kind, drop the off-screen
  //    ones, and bump animation frame.
  const advanced: InvaderBullet[] = [];
  for (const ib of state.invaderBullets) {
    const newPos = stepInvaderBulletPos(ib);
    if (newPos.y > SCREEN_BOTTOM_Y) continue;
    advanced.push({
      ...ib,
      pos: newPos,
      animationFrame: (ib.animationFrame + 1) % ALIEN_SHOT_ANIMATION_FRAMES,
    });
  }

  // 3. Maybe spawn a new invader shot. The shot kind cycles through
  //    rolling -> plunger -> squiggly, skipping plunger when only one
  //    alien is left (Code.html:995-996).
  let invaderBullets: readonly InvaderBullet[] = advanced;
  if (
    advanced.length < MAX_INVADER_BULLETS &&
    state.frame > 0 &&
    state.frame % INVADER_FIRE_INTERVAL_FRAMES === 0
  ) {
    const aliveCount = countAlive(state.invaders);
    const cycleIdx = Math.floor(state.frame / INVADER_FIRE_INTERVAL_FRAMES);
    const kind = chooseShotKind(cycleIdx, aliveCount);
    const shooter = pickShooter(state, kind);
    if (shooter) {
      const next: InvaderBullet = {
        id: `ib_${state.frame}`,
        pos: { x: shooter.x + 7, y: shooter.y + 12 },
        velocity: { x: 0, y: ALIEN_SHOT_SPEED_PX_PER_TICK },
        kind,
        animationFrame: 0,
      };
      invaderBullets = [...advanced, next];
    }
  }

  if (
    playerBullet === state.playerBullet &&
    invaderBullets === state.invaderBullets
  ) {
    return state;
  }
  return { ...state, playerBullet, invaderBullets };
}

/** Pure: depends only on the bullet's kind + animationFrame. */
function stepInvaderBulletPos(ib: InvaderBullet): { x: number; y: number } {
  const baseY = ib.pos.y + ib.velocity.y;
  if (ib.kind === 'squiggly') {
    // Sine weave around the original spawn-x. animationFrame drives
    // the phase so the path is deterministic and replayable.
    const nextOffset = squigglyOffset(ib.animationFrame + 1);
    const prevOffset = squigglyOffset(ib.animationFrame);
    return { x: ib.pos.x + nextOffset - prevOffset, y: baseY };
  }
  // Rolling and plunger fall straight down.
  return { x: ib.pos.x, y: baseY };
}

function squigglyOffset(animationFrame: number): number {
  const phase = (animationFrame / SQUIGGLY_PERIOD_FRAMES) * Math.PI * 2;
  return Math.round(Math.sin(phase) * SQUIGGLY_AMPLITUDE_PX);
}

/** Pick the next shot kind, skipping plunger when 1 alien is left. */
export function chooseShotKind(cycleIdx: number, aliveCount: number): AlienShotKind {
  let candidate = ALIEN_SHOT_CYCLE[cycleIdx % ALIEN_SHOT_CYCLE.length] as AlienShotKind;
  if (candidate === 'plunger' && aliveCount <= PLUNGER_DISABLED_AT_ALIVE) {
    candidate = ALIEN_SHOT_CYCLE[(cycleIdx + 1) % ALIEN_SHOT_CYCLE.length] as AlienShotKind;
  }
  return candidate;
}

function countAlive(invaders: readonly Invader[]): number {
  let n = 0;
  for (const inv of invaders) if (inv.alive) n++;
  return n;
}

/**
 * Pick the position of the alien that fires this shot.
 *
 * - rolling: column closest to the player's center x (Code.html:910)
 * - plunger: deterministic column rotation
 * - squiggly: same column rotation as plunger, offset by 1
 *
 * In all cases the bottom-most alive alien in the chosen column
 * does the firing.
 */
export function pickShooter(
  state: GameState,
  kind: AlienShotKind,
): { x: number; y: number } | null {
  const bottomMost = new Map<number, Invader>();
  for (const inv of state.invaders) {
    if (!inv.alive) continue;
    const cur = bottomMost.get(inv.col);
    if (!cur || inv.pos.y > cur.pos.y) bottomMost.set(inv.col, inv);
  }
  if (bottomMost.size === 0) return null;
  const aliveCols = [...bottomMost.keys()].sort((a, b) => a - b);

  let chosenCol: number;
  if (kind === 'rolling') {
    const playerCenterX = state.player.pos.x + 8;
    chosenCol = aliveCols[0] as number;
    let bestDist = Infinity;
    for (const col of aliveCols) {
      const colX = bottomMost.get(col)!.pos.x;
      const dist = Math.abs(colX - playerCenterX);
      if (dist < bestDist) {
        bestDist = dist;
        chosenCol = col;
      }
    }
  } else {
    const cycleIdx = Math.floor(state.frame / INVADER_FIRE_INTERVAL_FRAMES);
    const offset = kind === 'plunger' ? 0 : 1;
    chosenCol = aliveCols[(cycleIdx + offset) % aliveCols.length] as number;
  }

  const inv = bottomMost.get(chosenCol);
  return inv ? inv.pos : null;
}
