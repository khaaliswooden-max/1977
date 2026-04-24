import { describe, expect, it } from 'vitest';
import {
  PLAYER_MAX_X,
  PLAYER_MIN_X,
  PLAYER_Y,
  tickPlayer,
} from '@/game/systems/player';
import { initialState } from '@/game/state';
import type { GameEvent } from '@/types/audio';
import type { Clock } from '@/types/clock';
import type { GameState } from '@/types/game';
import type { InputSnapshot } from '@/types/input';
import { NEUTRAL_INPUT } from '@/types/input';

const clock: Clock = { currentTime: 0, currentStep: () => 0 };

function playing(): GameState {
  return { ...initialState(), mode: { kind: 'playing', wave: 1 } };
}

function input(overrides: Partial<InputSnapshot>): InputSnapshot {
  return { ...NEUTRAL_INPUT, ...overrides };
}

describe('tickPlayer', () => {
  it('does nothing on title screen', () => {
    const s = initialState();
    const events: GameEvent[] = [];
    const r = tickPlayer(s, input({ left: true }), clock, events);
    expect(r).toBe(s);
    expect(events).toEqual([]);
  });

  it('moves left with input.left', () => {
    const s = { ...playing(), player: { ...playing().player, pos: { x: 100, y: PLAYER_Y } } };
    const events: GameEvent[] = [];
    const r = tickPlayer(s, input({ left: true }), clock, events);
    expect(r.player.pos.x).toBe(99);
  });

  it('moves right with input.right', () => {
    const s = { ...playing(), player: { ...playing().player, pos: { x: 100, y: PLAYER_Y } } };
    const events: GameEvent[] = [];
    const r = tickPlayer(s, input({ right: true }), clock, events);
    expect(r.player.pos.x).toBe(101);
  });

  it('clamps to PLAYER_MIN_X', () => {
    const s = { ...playing(), player: { ...playing().player, pos: { x: PLAYER_MIN_X, y: PLAYER_Y } } };
    const r = tickPlayer(s, input({ left: true }), clock, []);
    expect(r.player.pos.x).toBe(PLAYER_MIN_X);
  });

  it('clamps to PLAYER_MAX_X', () => {
    const s = { ...playing(), player: { ...playing().player, pos: { x: PLAYER_MAX_X, y: PLAYER_Y } } };
    const r = tickPlayer(s, input({ right: true }), clock, []);
    expect(r.player.pos.x).toBe(PLAYER_MAX_X);
  });

  it('left and right both pressed cancel out', () => {
    const s = { ...playing(), player: { ...playing().player, pos: { x: 100, y: PLAYER_Y } } };
    const r = tickPlayer(s, input({ left: true, right: true }), clock, []);
    expect(r.player.pos.x).toBe(100);
  });

  it('fires a bullet when none exists', () => {
    const s = playing();
    const events: GameEvent[] = [];
    const r = tickPlayer(s, input({ fire: true }), clock, events);
    expect(r.playerBullet).not.toBeNull();
    expect(r.playerBullet?.velocity.y).toBeLessThan(0);
    expect(events).toEqual([{ type: 'player_shoot' }]);
    expect(r.player.shotsFired).toBe(1);
  });

  it('does NOT fire while a bullet is in flight', () => {
    const s = playing();
    const events: GameEvent[] = [];
    const r1 = tickPlayer(s, input({ fire: true }), clock, events);
    const r2 = tickPlayer(r1, input({ fire: true }), clock, events);
    expect(r2.playerBullet).toBe(r1.playerBullet);
    expect(events).toHaveLength(1);
    expect(r2.player.shotsFired).toBe(1);
  });

  it('does nothing while player is dead', () => {
    const dead = { ...playing(), player: { ...playing().player, alive: false } };
    const r = tickPlayer(dead, input({ left: true, fire: true }), clock, []);
    expect(r).toBe(dead);
  });

  it('returns same state object when nothing changes', () => {
    const s = playing();
    const r = tickPlayer(s, NEUTRAL_INPUT, clock, []);
    expect(r).toBe(s);
  });
});
