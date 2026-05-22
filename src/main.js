import Phaser from 'phaser';
import { ATARI_WIDTH, ATARI_HEIGHT, RENDER_CONFIG, SCALE_CONFIG, ATARI_FPS } from './config.js';
import Boot     from './scenes/Boot.js';
import Preload  from './scenes/Preload.js';
import Game1977 from './scenes/Game1977.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: ATARI_WIDTH,
  height: ATARI_HEIGHT,
  backgroundColor: '#000000',
  render: RENDER_CONFIG,
  scale: SCALE_CONFIG,
  fps: { target: ATARI_FPS, forceSetTimeOut: false },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 }, // Atari-era floaty platformer feel
      debug: import.meta.env.DEV,
    },
  },
  scene: [Boot, Preload, Game1977],
});
