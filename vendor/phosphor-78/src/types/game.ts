// Game-state shape. ADR-001: every reducer takes the previous state +
// input + the audio clock and returns a new state plus a list of
// discrete events. State is immutable; produced state is structurally
// shared with the previous frame's where possible.

import type { PixelPos } from '@/util/coords';

export type InvaderKind = 'top' | 'middle' | 'bottom';
export type InvaderBulletKind = 'rolling' | 'plunger' | 'squiggly';
export type Cardinal = 'left' | 'right';

// 11 columns x 5 rows.
export interface Invader {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly pos: PixelPos;
  readonly kind: InvaderKind;
  readonly alive: boolean;
  /** Frame index of death, used for the dying-sprite animation. */
  readonly killedAtFrame?: number;
}

export interface Bullet {
  readonly id: string;
  readonly pos: PixelPos;
  readonly velocity: PixelPos;
}

export interface InvaderBullet extends Bullet {
  readonly kind: InvaderBulletKind;
  /** 4-frame animation cycle index. */
  readonly animationFrame: number;
}

export interface Shield {
  /** Top-left corner of the 22x16 bitmap. */
  readonly origin: PixelPos;
  /** 22*16 = 352 bits packed into 44 bytes (22 wide / 8 = 3 bytes per row, etc.) */
  readonly bitmap: Uint8Array;
}

export interface Ufo {
  readonly active: boolean;
  readonly pos: PixelPos;
  readonly direction: Cardinal;
  /** Frames until the next spawn check (placeholder; story 2.3 refines). */
  readonly spawnCooldownFrames: number;
}

export interface Player {
  readonly pos: PixelPos;
  readonly alive: boolean;
  /** Frames remaining in the death animation (>0 = invulnerable). */
  readonly deathAnimationFrames: number;
  /** Total shots fired - used by UFO scoring (FR11). */
  readonly shotsFired: number;
}

export type GameMode =
  | { readonly kind: 'title' }
  | { readonly kind: 'playing'; readonly wave: number }
  | { readonly kind: 'gameover'; readonly finalScore: number };

export interface HighScore {
  readonly initials: string;
  readonly score: number;
  readonly date: string;
}

export interface GameState {
  readonly mode: GameMode;
  readonly invaders: readonly Invader[];
  readonly invaderDirection: Cardinal;
  readonly playerBullet: Bullet | null;
  readonly invaderBullets: readonly InvaderBullet[];
  readonly shields: readonly Shield[];
  readonly ufo: Ufo;
  readonly player: Player;
  readonly score: number;
  readonly extraLifeAt: number;
  readonly lives: number;
  readonly highScores: readonly HighScore[];
  /**
   * Number of saucer hits so far, used by the original game's
   * 15-entry buggy score-cycle table to award the next saucer's
   * points. Incremented when the player destroys a saucer.
   */
  readonly saucerHits: number;
  readonly frame: number;
}
