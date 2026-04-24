// FR6, FR7, FR8: the 5x11 invader formation.
//
// CONSTANTS POLICY (NFR21 / CR12 / Story 2.6):
// ROM-derived 1:1 constants live in @/constants/computer-archeology
// with line citations. The values declared here (formation spacing,
// step sizes, screen-edge bounds) are visual-placement
// approximations not directly traceable to specific ROM addresses.
//
// The original game advances the formation one invader at a time
// (left-to-right, bottom-to-top). For the placeholder pass we step
// the WHOLE formation in lockstep — visually similar enough to play,
// far simpler to read. A future story will swap in per-invader
// stepping honoring the disassembly's exact cadence.

import { marchDelayInterrupts } from '@/constants/computer-archeology';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { Cardinal, GameState, Invader, InvaderKind } from '@/types/game';

export const FORMATION_ROWS = 5;
export const FORMATION_COLS = 11;
export const INVADER_SPACING_X = 16;
export const INVADER_SPACING_Y = 16;
export const FORMATION_TOP_Y = 56;
export const FORMATION_LEFT_X = 24;
export const FORMATION_STEP_X = 2;
export const FORMATION_STEP_DOWN_Y = 8;
export const FORMATION_RIGHT_BOUND_X = 224 - INVADER_SPACING_X - 8;
export const FORMATION_LEFT_BOUND_X = 8;

function kindForRow(row: number): InvaderKind {
  if (row === 0) return 'top';
  if (row < 3) return 'middle';
  return 'bottom';
}

export function makeInitialFormation(): readonly Invader[] {
  const result: Invader[] = [];
  for (let row = 0; row < FORMATION_ROWS; row++) {
    for (let col = 0; col < FORMATION_COLS; col++) {
      result.push({
        id: `inv_${row}_${col}`,
        row,
        col,
        pos: {
          x: FORMATION_LEFT_X + col * INVADER_SPACING_X,
          y: FORMATION_TOP_Y + row * INVADER_SPACING_Y,
        },
        kind: kindForRow(row),
        alive: true,
      });
    }
  }
  return result;
}

function aliveCount(invaders: readonly Invader[]): number {
  let n = 0;
  for (const inv of invaders) if (inv.alive) n++;
  return n;
}

function bounds(invaders: readonly Invader[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const inv of invaders) {
    if (!inv.alive) continue;
    if (inv.pos.x < minX) minX = inv.pos.x;
    if (inv.pos.x > maxX) maxX = inv.pos.x;
    if (inv.pos.y > maxY) maxY = inv.pos.y;
  }
  return { minX, maxX, maxY };
}

export function tickInvaders(
  state: GameState,
  _input: unknown,
  clock: Clock,
  _events: GameEvent[],
): GameState {
  if (state.mode.kind !== 'playing') return state;
  if (state.invaders.length === 0) return state;

  const remaining = aliveCount(state.invaders);
  if (remaining === 0) return state;

  const step = clock.currentStep(remaining);
  // We advance the formation each time the step index changes from
  // the value we last advanced on. We piggyback that "last step" on
  // the frame counter modulo: store-elsewhere would require more
  // state-shape changes than this story buys, so we take the simple
  // approach: advance every N frames where N derives from the same
  // function the AudioClock uses.
  // Simplification for the placeholder: advance once per frame when
  // remaining is small (fast), once every several frames otherwise.
  // Story 2.1 will make this exact.
  const shouldStep = step % 1 === 0 && state.frame % stepFrameInterval(remaining) === 0;
  if (!shouldStep) return state;

  const { minX, maxX } = bounds(state.invaders);
  let direction: Cardinal = state.invaderDirection;
  let stepDown = false;
  if (direction === 'right' && maxX + FORMATION_STEP_X >= FORMATION_RIGHT_BOUND_X) {
    direction = 'left';
    stepDown = true;
  } else if (direction === 'left' && minX - FORMATION_STEP_X <= FORMATION_LEFT_BOUND_X) {
    direction = 'right';
    stepDown = true;
  }

  const dx = stepDown ? 0 : direction === 'right' ? FORMATION_STEP_X : -FORMATION_STEP_X;
  const dy = stepDown ? FORMATION_STEP_DOWN_Y : 0;

  const invaders: Invader[] = state.invaders.map((inv) =>
    inv.alive
      ? { ...inv, pos: { x: inv.pos.x + dx, y: inv.pos.y + dy } }
      : inv,
  );

  return {
    ...state,
    invaders,
    invaderDirection: direction,
  };
}

/**
 * Story 5.14: ROM-derived step interval. The original game uses
 * its 60Hz interrupt count as both the audio beat AND the alien
 * march cadence (one alien moves per beat). Our game loop is
 * also 60Hz, so the interrupt count from MARCH_TEMPO_TABLE is
 * directly the per-frame step interval.
 *
 * Old placeholder math (round(60 / (60 - N + 5))) made the
 * formation roughly 8-9× too fast at wave start and ~5× too
 * fast in the endgame. Replacing with marchDelayInterrupts
 * brings the felt tempo into line with the original arcade.
 *
 * Caveat: we still step the WHOLE formation per beat (the
 * placeholder), not one alien at a time as the original does.
 * Per-invader stepping is a post-v1 follow-up.
 */
export function stepFrameInterval(remainingAlive: number): number {
  return Math.max(1, marchDelayInterrupts(remainingAlive));
}
