// FR13, FR15: scoring with 9999 wrap and extra-life thresholds.
// Pure: derives next score+lives+extraLifeAt from events that
// preceding sub-reducers pushed onto the events array.

import {
  ALIEN_SCORE_BOTTOM,
  ALIEN_SCORE_MIDDLE,
  ALIEN_SCORE_TOP,
  EXTRA_LIFE_AT,
  SCORE_WRAP as ARCHAEOLOGY_SCORE_WRAP,
  saucerScoreForHit,
} from '@/constants/computer-archeology';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState, Invader, InvaderKind } from '@/types/game';

// Re-export under the existing names so module consumers don't have
// to rewrite imports. Source-of-truth lives in computer-archeology.ts.
export const SCORE_WRAP = ARCHAEOLOGY_SCORE_WRAP;
export const EXTRA_LIFE_INCREMENT = EXTRA_LIFE_AT;

const KIND_SCORE: Record<InvaderKind, number> = {
  top: ALIEN_SCORE_TOP,
  middle: ALIEN_SCORE_MIDDLE,
  bottom: ALIEN_SCORE_BOTTOM,
};

export function scoreForInvaderKind(kind: InvaderKind): number {
  return KIND_SCORE[kind];
}

/**
 * Apply the score effects of any events emitted earlier this tick.
 * Doesn't push events of its own except extra_life when the running
 * total crosses the next threshold.
 */
export function tickScore(
  state: GameState,
  _input: unknown,
  _clock: Clock,
  events: GameEvent[],
): GameState {
  let score = state.score;
  let lives = state.lives;
  let extraLifeAt = state.extraLifeAt;
  let saucerHits = state.saucerHits;

  for (const e of events) {
    if (e.type === 'invader_killed') {
      const inv = findInvader(state.invaders, e.row, e.col);
      if (inv) score += scoreForInvaderKind(inv.kind);
    } else if (e.type === 'ufo_killed') {
      // The event carries the score the collision handler computed
      // (via saucerScoreForHit at the moment of the hit). We trust
      // it and just add. saucerHits also increments here so future
      // ufo_killed events use the next slot in the cycle.
      score += e.score;
      saucerHits += 1;
    }
  }

  if (score >= SCORE_WRAP) score = score % SCORE_WRAP;

  // Extra-life thresholds. Awarding multiple lives at once is rare
  // but possible if a single invader_killed crossed multiple
  // boundaries (very unlikely with 30/20/10 scores and 1500-step
  // thresholds, but the loop covers it).
  while (score >= extraLifeAt && extraLifeAt < SCORE_WRAP) {
    lives += 1;
    events.push({ type: 'extra_life', threshold: extraLifeAt });
    extraLifeAt += EXTRA_LIFE_INCREMENT;
  }

  if (
    score === state.score &&
    lives === state.lives &&
    extraLifeAt === state.extraLifeAt &&
    saucerHits === state.saucerHits
  ) {
    return state;
  }
  return { ...state, score, lives, extraLifeAt, saucerHits };
}

/**
 * Convenience for any future collision system that needs to know
 * what the NEXT saucer hit will award. Takes the current saucerHits
 * count from state and returns the points the next destruction
 * would yield, per the disassembly cycle table.
 */
export function nextSaucerScore(saucerHits: number): number {
  return saucerScoreForHit(saucerHits + 1);
}

function findInvader(
  invaders: readonly Invader[],
  row: number,
  col: number,
): Invader | undefined {
  for (const inv of invaders) {
    if (inv.row === row && inv.col === col) return inv;
  }
  return undefined;
}
