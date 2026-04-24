// Top-level reducer. ADR-001 + N3: pure function, returns the next
// state plus a list of discrete events for downstream subsystems to
// consume. CR1 enforces purity: no Date.now / Math.random / console /
// DOM access here or in any sub-reducer.

import type { GameEvent } from '@/types/audio';
import type { GameState } from '@/types/game';
import type { InputSnapshot } from '@/types/input';
import type { Tick } from '@/game/state';
import { tickBullets } from '@/game/systems/bullets';
import { tickCollisions } from '@/game/systems/collisions';
import { tickInvaders } from '@/game/systems/invaders';
import { tickPlayer } from '@/game/systems/player';
import { tickScore } from '@/game/systems/score';
import { tickShields } from '@/game/systems/shields';
import { tickTitle } from '@/game/systems/title';
import { tickUfo } from '@/game/systems/ufo';
import { tickWave } from '@/game/systems/wave';

export const tick: Tick<GameState, InputSnapshot> = (state, input, clock) => {
  const events: GameEvent[] = [];
  let s = state;
  // Title transitions run first so confirm presses on title /
  // gameover screens become a fresh playing state for the rest.
  s = tickTitle(s, input, clock, events);
  s = tickInvaders(s, input, clock, events);
  s = tickBullets(s, input, clock, events);
  s = tickShields(s, input, clock, events);
  s = tickUfo(s, input, clock, events);
  s = tickPlayer(s, input, clock, events);
  // Collisions runs AFTER all movements + spawning, BEFORE score
  // (so the kill events it pushes can be consumed by tickScore)
  // and BEFORE wave (so wave can detect "all invaders dead" and
  // trigger wave_cleared).
  s = tickCollisions(s, input, clock, events);
  s = tickScore(s, input, clock, events);
  s = tickWave(s, input, clock, events);
  s = { ...s, frame: s.frame + 1 };
  return { next: s, events };
};
