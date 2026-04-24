// Game-scene rasterizer: draws a GameState into a 224x256 Canvas2D
// at logical-pixel scale. Output is an HTMLCanvasElement that the
// WebGL pipeline (story 4.2+) uploads as a texture each frame.
//
// This is a near-1:1 port of the M1 placeholder renderer (story
// 1.18) — same color palette, same layout, same HUD glyphs. The
// difference is it now writes to an off-screen canvas instead of
// the visible one; the WebGL pipeline does the visible blit with
// CRT effects on top.

import { Sprites, drawSprite } from '@/render/sprites';
import type { GameState, Invader } from '@/types/game';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '@/util/coords';

const COLOR_BG = '#000000';
const COLOR_PLAYER = '#00ff66';
const COLOR_INVADER = '#ffffff';
const COLOR_BULLET = '#ffffff';
const COLOR_SHIELD = '#22ff44';
const COLOR_UFO = '#ff00ff';
const COLOR_HUD = '#ffffff';

export interface SceneRasterizer {
  /** The canvas the scene is rasterized into. Pass to GL upload. */
  readonly canvas: HTMLCanvasElement;
  /** Render the state into this.canvas. */
  draw(state: GameState): void;
}

export function createSceneRasterizer(): SceneRasterizer {
  const canvas = document.createElement('canvas');
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('invariant: scene 2d context unavailable');
  ctx.imageSmoothingEnabled = false;

  return {
    canvas,
    draw(state) {
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      drawHud(ctx, state);

      if (state.mode.kind === 'title') {
        drawTitle(ctx);
        return;
      }
      if (state.mode.kind === 'gameover') {
        drawGameOver(ctx, state.mode.finalScore);
        return;
      }

      drawShields(ctx, state);
      drawInvaders(ctx, state.invaders, state.frame);
      drawUfo(ctx, state);
      drawPlayer(ctx, state);
      drawBullets(ctx, state);
    },
  };
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.fillStyle = COLOR_HUD;
  ctx.font = '8px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(`SCORE ${pad(s.score, 4)}`, 4, 4);
  ctx.fillText(`LIVES ${s.lives}`, LOGICAL_WIDTH - 56, 4);
}

function drawTitle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR_PLAYER;
  ctx.font = '12px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('PHOSPHOR 78', 60, 70);
  ctx.fillStyle = COLOR_HUD;
  ctx.font = '8px monospace';
  ctx.fillText('PRESS ENTER', 76, 110);
  ctx.fillText('\u00a9 1978 TAITO', 70, 200);
  ctx.fillText('homage / study', 70, 212);
}

function drawGameOver(ctx: CanvasRenderingContext2D, finalScore: number): void {
  ctx.fillStyle = COLOR_INVADER;
  ctx.font = '12px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('GAME OVER', 70, 90);
  ctx.font = '8px monospace';
  ctx.fillText(`SCORE ${pad(finalScore, 4)}`, 80, 130);
  ctx.fillText('PRESS ENTER', 76, 160);
}

function drawShields(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.fillStyle = COLOR_SHIELD;
  for (const sh of s.shields) {
    const { origin, bitmap } = sh;
    for (let y = 0; y < 16; y++) {
      for (let xByte = 0; xByte < 3; xByte++) {
        const byte = bitmap[y * 3 + xByte] ?? 0;
        if (byte === 0) continue;
        for (let bit = 0; bit < 8; bit++) {
          if (byte & (1 << (7 - bit))) {
            const x = xByte * 8 + bit;
            if (x < 22) ctx.fillRect(origin.x + x, origin.y + y, 1, 1);
          }
        }
      }
    }
  }
}

function drawInvaders(
  ctx: CanvasRenderingContext2D,
  invaders: readonly Invader[],
  currentFrame: number,
): void {
  ctx.fillStyle = COLOR_INVADER;
  for (const inv of invaders) {
    if (!inv.alive) {
      // Brief explosion sprite for ~10 frames after death.
      if (
        inv.killedAtFrame !== undefined &&
        currentFrame - inv.killedAtFrame < 10
      ) {
        drawSprite(ctx, Sprites.invaderExplosion, inv.pos.x, inv.pos.y);
      }
      continue;
    }
    const sprite =
      inv.kind === 'top'
        ? Sprites.topAlien
        : inv.kind === 'middle'
        ? Sprites.middleAlien
        : Sprites.bottomAlien;
    drawSprite(ctx, sprite, inv.pos.x, inv.pos.y);
  }
}

function drawUfo(ctx: CanvasRenderingContext2D, s: GameState): void {
  if (!s.ufo.active) return;
  ctx.fillStyle = COLOR_UFO;
  drawSprite(ctx, Sprites.ufo, s.ufo.pos.x, s.ufo.pos.y);
}

function drawPlayer(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.fillStyle = COLOR_PLAYER;
  if (s.player.alive) {
    drawSprite(ctx, Sprites.playerShip, s.player.pos.x, s.player.pos.y);
    return;
  }
  if (s.player.deathAnimationFrames > 0) {
    // Alternate two cannon-fragment frames every 6 frames so the
    // explosion actually animates instead of just blinking.
    const sprite =
      Math.floor(s.player.deathAnimationFrames / 6) % 2 === 0
        ? Sprites.playerExplosionA
        : Sprites.playerExplosionB;
    drawSprite(ctx, sprite, s.player.pos.x, s.player.pos.y);
  }
}

function drawBullets(ctx: CanvasRenderingContext2D, s: GameState): void {
  ctx.fillStyle = COLOR_BULLET;
  if (s.playerBullet) {
    ctx.fillRect(s.playerBullet.pos.x, s.playerBullet.pos.y, 1, 4);
  }
  for (const ib of s.invaderBullets) {
    ctx.fillRect(ib.pos.x, ib.pos.y, 1, 4);
  }
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}
