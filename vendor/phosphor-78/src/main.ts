// Phosphor 78 — entry point. M1 end-to-end ugly-but-complete wiring.

import { AudioClock } from '@/audio/clock';
import { createAudioEngine } from '@/audio/engine';
import { setupAudioLifecycle } from '@/audio/lifecycle';
import { createInput } from '@/game/input';
import { startGameLoop } from '@/game/loop';
import { createPauseController } from '@/game/pause';
import { initialState } from '@/game/state';
import { setupPixelPipeline } from '@/foundation/pixel-pipeline';
import { createPlaceholderRenderer } from '@/render/pipeline';
import { log } from '@/util/log';

log.info('boot');

const app = document.getElementById('app');
if (!app) throw new Error('invariant: #app element missing');

const canvas = document.createElement('canvas');
canvas.id = 'game';
app.replaceChildren(canvas);

const layout = setupPixelPipeline(canvas);
log.info(`pixel pipeline scale=${layout.scale}`);

const renderer = createPlaceholderRenderer(canvas);
const audioCtx = new (window.AudioContext ||
  (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
const audioClock = new AudioClock(audioCtx);
const audioEngine = createAudioEngine(audioCtx, audioClock);
setupAudioLifecycle(audioCtx);

const input = createInput();
const pause = createPauseController({
  hooks: {
    onPause: () => {
      void audioCtx.suspend();
    },
    onResume: () => {
      void audioCtx.resume();
    },
  },
});

const handle = startGameLoop(initialState(), {
  clock: audioClock,
  input,
  render: (state) => {
    renderer.draw(state);
    // Story 3.6: drive the audio engine's per-frame tick alongside
    // the renderer. The reducer's per-event triggers go through
    // onEvents below; the per-frame state goes through tick().
    const remaining = state.invaders.filter((i) => i.alive).length;
    audioEngine.tick({ remainingInvaders: remaining, ufoActive: state.ufo.active });
  },
  onEvents: (events) => audioEngine.handle(events),
});

// Wire pause input — the loop ignores tick advances while paused, so
// we just toggle on rising edges of the pause button.
let lastPause = false;
const pollPauseInput = () => {
  const cur = input.snapshot().pause;
  if (cur && !lastPause) {
    if (pause.isPaused()) pause.resume();
    else pause.pause('manual');
    handle[pause.isPaused() ? 'pause' : 'resume']();
  }
  lastPause = cur;
  requestAnimationFrame(pollPauseInput);
};
requestAnimationFrame(pollPauseInput);

window.addEventListener('resize', () => {
  setupPixelPipeline(canvas);
});
