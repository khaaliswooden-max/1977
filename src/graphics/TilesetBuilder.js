// Builds the 3-tile tileset texture from NTSC palette colors.
// Call createAtariTileset(scene) in Preload.preload() before the tilemap is created.
// Tile 0 = wall (grey), Tile 1 = ground (green), Tile 2 = platform (tan)
// Layout: 24×8 px total (3 tiles × 8 px wide)

export function createAtariTileset(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });

  // Tile 0 — Wall: NTSC hue 0 grey
  g.fillStyle(0x909090);
  g.fillRect(0, 0, 8, 8);
  g.fillStyle(0xb0b0b0);
  g.fillRect(0, 0, 8, 1);
  g.fillStyle(0x6c6c6c);
  g.fillRect(0, 7, 8, 1);

  // Tile 1 — Ground: NTSC hue 13 yellow-green
  g.fillStyle(0x507424);
  g.fillRect(8, 0, 8, 8);
  g.fillStyle(0x6c9038);
  g.fillRect(8, 0, 8, 2);
  g.fillStyle(0x345810);
  g.fillRect(8, 6, 8, 2);

  // Tile 2 — Platform: NTSC hue 2 orange-gold
  g.fillStyle(0xac783c);
  g.fillRect(16, 0, 8, 8);
  g.fillStyle(0xcca05c);
  g.fillRect(16, 0, 8, 2);
  g.fillStyle(0x702800);
  g.fillRect(16, 7, 8, 1);

  g.generateTexture('atari-tiles', 24, 8);
  g.destroy();
}
