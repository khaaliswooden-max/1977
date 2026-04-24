// ADR-001: initial state factory + the Tick contract every reducer
// (top-level and sub-) honors.

import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState, Player, Ufo } from '@/types/game';

export type Tick<S, I, E = GameEvent> = (
  state: S,
  input: I,
  clock: Clock,
) => { next: S; events: E[] };

const INITIAL_PLAYER: Player = {
  pos: { x: 16, y: 216 },
  alive: true,
  deathAnimationFrames: 0,
  shotsFired: 0,
};

const INITIAL_UFO: Ufo = {
  active: false,
  pos: { x: 0, y: 32 },
  direction: 'left',
  spawnCooldownFrames: 0,
};

export function initialState(): GameState {
  return {
    mode: { kind: 'title' },
    invaders: [],
    invaderDirection: 'right',
    playerBullet: null,
    invaderBullets: [],
    shields: [],
    ufo: INITIAL_UFO,
    player: INITIAL_PLAYER,
    score: 0,
    extraLifeAt: 1500,
    lives: 3,
    highScores: [],
    saucerHits: 0,
    frame: 0,
  };
}
