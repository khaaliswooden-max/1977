import Phaser from 'phaser';
import { ATARI_WIDTH, ATARI_HEIGHT } from '../config.js';
import { LEVEL1_DATA } from '../tilemaps/level1.js';

const TILE    = 8;
const SPEED   = 40;
const JUMP_VY = -130;

export default class Game1977 extends Phaser.Scene {
  constructor() {
    super({ key: 'Game1977' });
  }

  create() {
    const cam = this.cameras.main;
    cam.filters.external.addQuantize({ steps: [8, 8, 8, 8], dither: false, mode: 0 });
    cam.filters.external.addVignette({ radius: 0.75, strength: 0.35, color: 0x000000 });

    // Tilemap from inline data array (no external file needed yet)
    const map = this.make.tilemap({
      data: LEVEL1_DATA,
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = map.addTilesetImage('atari-tiles');
    const layer   = map.createLayer(0, tileset, 0, 0);
    layer.setCollision([0, 1, 2]); // all non-empty tile indices are solid

    // Player: gold rectangle (replace with Aseprite atlas sprite when ready)
    // Spawns in the open area above the long platform (row 13, col 9)
    this.player = this.add.rectangle(
      9 * TILE + TILE / 2,
      12 * TILE,
      6, 8,
      0xfcfc68  // NTSC gold
    );
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // Swap this for sprite + anims once Aseprite exports land:
    // this.player = this.physics.add.sprite(x, y, 'sparrows', 'cipher_idle_0');

    this.physics.add.collider(this.player, layer);
    this.physics.world.setBounds(0, 0, ATARI_WIDTH, ATARI_HEIGHT);

    this.cursors = this.input.keyboard.createCursorKeys();

    // HUD
    this.add.text(2, 2, 'CIPHER', {
      fontFamily: 'monospace', fontSize: '5px', color: '#fcfc68',
    }).setDepth(10);
  }

  update() {
    const { left, right, up } = this.cursors;
    const body = this.player.body;

    body.setVelocityX(
      left.isDown  ? -SPEED :
      right.isDown ?  SPEED : 0
    );

    if (Phaser.Input.Keyboard.JustDown(up) && body.blocked.down) {
      body.setVelocityY(JUMP_VY);
    }
  }
}
