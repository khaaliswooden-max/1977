import Phaser from 'phaser';
import { ATARI_WIDTH, ATARI_HEIGHT } from '../config.js';
import { createAtariTileset } from '../graphics/TilesetBuilder.js';

export default class Preload extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    const bar = this.add.graphics();
    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0xffffff);
      bar.fillRect(10, ATARI_HEIGHT / 2 - 3, (ATARI_WIDTH - 20) * value, 6);
    });
    this.load.on('complete', () => bar.destroy());

    // Uncomment as real Aseprite exports are added:
    // this.load.atlas('sparrows', 'assets/sprites/sparrows.png', 'assets/sprites/sparrows.json');
    // this.load.tilemapTiledJSON('level1', 'assets/tilemaps/level1.json');
    // this.load.audio('sfx', ['assets/audio/sfx.ogg', 'assets/audio/sfx.mp3']);
  }

  create() {
    // Build tileset texture now (graphics API, no file load needed)
    createAtariTileset(this);
    this.scene.start('Game1977');
  }
}
