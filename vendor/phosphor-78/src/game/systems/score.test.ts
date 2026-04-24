import { describe, expect, it } from 'vitest';
import { makeInitialFormation } from '@/game/systems/invaders';
import {
  EXTRA_LIFE_INCREMENT,
  SCORE_WRAP,
  scoreForInvaderKind,
  tickScore,
} from '@/game/systems/score';
import { initialState } from '@/game/state';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

describe('scoreForInvaderKind', () => {
  it('top=30, middle=20, bottom=10', () => {
    expect(scoreForInvaderKind('top')).toBe(30);
    expect(scoreForInvaderKind('middle')).toBe(20);
    expect(scoreForInvaderKind('bottom')).toBe(10);
  });
});

describe('tickScore', () => {
  it('adds invader_killed score by kind', () => {
    const s = { ...initialState(), invaders: makeInitialFormation() };
    const events: GameEvent[] = [
      { type: 'invader_killed', row: 0, col: 0 }, // top = 30
      { type: 'invader_killed', row: 4, col: 5 }, // bottom = 10
    ];
    const r = tickScore(s, NEUTRAL_INPUT, clock, events);
    expect(r.score).toBe(40);
  });

  it('adds ufo_killed score directly', () => {
    const s = initialState();
    const events: GameEvent[] = [{ type: 'ufo_killed', score: 300 }];
    const r = tickScore(s, NEUTRAL_INPUT, clock, events);
    expect(r.score).toBe(300);
  });

  it('wraps at 9999', () => {
    const s = { ...initialState(), score: SCORE_WRAP - 5 };
    const events: GameEvent[] = [{ type: 'ufo_killed', score: 100 }];
    const r = tickScore(s, NEUTRAL_INPUT, clock, events);
    expect(r.score).toBe(95);
  });

  it('awards extra life when crossing the threshold', () => {
    const s = { ...initialState(), score: 1490, lives: 3, extraLifeAt: 1500 };
    const events: GameEvent[] = [{ type: 'ufo_killed', score: 50 }];
    const r = tickScore(s, NEUTRAL_INPUT, clock, events);
    expect(r.score).toBe(1540);
    expect(r.lives).toBe(4);
    expect(r.extraLifeAt).toBe(1500 + EXTRA_LIFE_INCREMENT);
    expect(events.some((e) => e.type === 'extra_life')).toBe(true);
  });

  it('returns same state object when no relevant events', () => {
    const s = initialState();
    const r = tickScore(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });
});
