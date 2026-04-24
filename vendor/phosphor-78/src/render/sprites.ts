// Story 5.10: hand-drawn pixel sprites recognizable as the
// 1978 Space Invaders cast. Each pattern is a multiline string
// where '.' is off and 'X' is on. Sprite dimensions match the
// AABB rectangles used in src/game/systems/collisions.ts so
// hit-testing lines up with what the player sees.
//
// The patterns aren't byte-extracted from the Taito ROM (that's
// a post-v1 follow-up). They're hand-drawn from the canonical
// 1978 sprite designs, which have been published in countless
// retro-game references.

export type SpritePattern = readonly string[];

function build(pattern: SpritePattern): { width: number; height: number; data: Uint8Array } {
  const height = pattern.length;
  const width = pattern[0]?.length ?? 0;
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = pattern[y] ?? '';
    for (let x = 0; x < width; x++) {
      if (row[x] === 'X' || row[x] === '#') data[y * width + x] = 1;
    }
  }
  return { width, height, data };
}

// Top-row alien (squid). 12x8.
const TOP_ALIEN = build([
  '....XXXX....',
  '.XXXXXXXXXX.',
  'XXX.XXXX.XXX',
  'XXXXXXXXXXXX',
  '.X.XXXXXX.X.',
  'X.XXXXXXXX.X',
  'X.X......X.X',
  '...XX..XX...',
]);

// Middle-row aliens (crab). 12x8.
const MIDDLE_ALIEN = build([
  '..X......X..',
  '...X....X...',
  '..XXXXXXXX..',
  '.XX.XXXX.XX.',
  'XXXXXXXXXXXX',
  'X.XXXXXXXX.X',
  'X.X......X.X',
  '...XX..XX...',
]);

// Bottom-row aliens (octopus). 12x8.
const BOTTOM_ALIEN = build([
  '...XXXXXX...',
  '.XXXXXXXXXX.',
  'XX.XXXXXX.XX',
  'XXXXXXXXXXXX',
  'X.XXXXXXXX.X',
  'X.X......X.X',
  '..XX....XX..',
  '.X..XXXX..X.',
]);

// Player ship (cannon). 16x8.
const PLAYER_SHIP = build([
  '........X.......',
  '.......XXX......',
  '.......XXX......',
  '.XXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
]);

// Player explosion frame A — cannon body cracked, silhouette
// still recognizable. 16x8.
const PLAYER_EXPLOSION_A = build([
  '........X.......',
  '.....X.XXX..X...',
  '.......XXX......',
  '.XX.XXXXX.XXXXX.',
  'XXXX.XXXXX.XXXXX',
  'XXXXXXX.XX.XX.XX',
  'XX.X.XXXXXXX.X.X',
  '.XX.XX.XXX.XX.X.',
]);

// Player explosion frame B — cannon broken further, debris
// scattered outward. 16x8.
const PLAYER_EXPLOSION_B = build([
  '....X..X.X..X...',
  '.X.X..XXX..X..X.',
  '....X..X..X.....',
  '.X.X.X.X.X.X.X..',
  'X.XXX.XX.XX.XX.X',
  'XX.X.XXX.X.X.XXX',
  '.X.X.X.X.X.X.X.X',
  'X.X.X.....X.X.X.',
]);

// UFO (mystery ship). 16x7.
const UFO = build([
  '....XXXXXXXX....',
  '..XXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXX.',
  'XX.XX.XX.XX.XXXX',
  'XXXXXXXXXXXXXXXX',
  '..XXX..XXX..XXX.',
  '...X.....X.....X',
]);

// Generic invader explosion (alien-killed sprite). 12x8.
const INVADER_EXPLOSION = build([
  '...X.....X..',
  '....X...X.X.',
  '..X..X..X...',
  '....XXXXX...',
  '..XXXXXXXX..',
  '..XX.XXX.XX.',
  '...X.X.X.X..',
  '....X...X...',
]);

export const Sprites = {
  topAlien: TOP_ALIEN,
  middleAlien: MIDDLE_ALIEN,
  bottomAlien: BOTTOM_ALIEN,
  playerShip: PLAYER_SHIP,
  playerExplosionA: PLAYER_EXPLOSION_A,
  playerExplosionB: PLAYER_EXPLOSION_B,
  ufo: UFO,
  invaderExplosion: INVADER_EXPLOSION,
} as const;

/**
 * Draw a sprite into a Canvas2D context at logical-pixel scale.
 * Color comes from the caller via ctx.fillStyle being set
 * BEFORE the call.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: { width: number; height: number; data: Uint8Array },
  x: number,
  y: number,
): void {
  const { width, height, data } = sprite;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      if (data[py * width + px]) ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}
