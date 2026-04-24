import { describe, expect, it } from 'vitest';
import { initialState } from '@/game/state';

describe('initialState', () => {
  it('starts on the title screen', () => {
    const s = initialState();
    expect(s.mode.kind).toBe('title');
  });

  it('starts with 3 lives, 0 score, no bullet, no invaders', () => {
    const s = initialState();
    expect(s.lives).toBe(3);
    expect(s.score).toBe(0);
    expect(s.playerBullet).toBeNull();
    expect(s.invaders).toHaveLength(0);
    expect(s.invaderBullets).toHaveLength(0);
  });

  it('extra life threshold matches FR13 default', () => {
    expect(initialState().extraLifeAt).toBe(1500);
  });

  it('returns a fresh object each call', () => {
    const a = initialState();
    const b = initialState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('frame counter starts at 0', () => {
    expect(initialState().frame).toBe(0);
  });
});
