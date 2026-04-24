// Companion-page embedded mini game preview. Draws the full
// running game into a small canvas so visitors can watch the
// CRT shader respond to slider changes in real time.
//
// We deliberately spin up a SECOND set of game/audio/loop state
// here rather than mirror the main game. That keeps the companion
// page self-contained and avoids racing with whatever the main
// page might have happening (the visitor is on companion only —
// the game page isn't even loaded at the same time).

import { AudioClock } from '@/audio/clock';
import { createInput } from '@/game/input';
import { startGameLoop } from '@/game/loop';
import { initialState } from '@/game/state';
import { setupPixelPipeline } from '@/foundation/pixel-pipeline';
import { createRenderer } from '@/render/pipeline';
import { log } from '@/util/log';

export interface MiniGameHandle {
  readonly canvas: HTMLCanvasElement;
  start(): void;
  dispose(): void;
}

export function createMiniGame(): MiniGameHandle {
  const canvas = document.createElement('canvas');
  canvas.id = 'mini-game';
  setupPixelPipeline(canvas);

  let renderer: ReturnType<typeof createRenderer> | null = null;
  let loopHandle: ReturnType<typeof startGameLoop> | null = null;
  let input: ReturnType<typeof createInput> | null = null;
  let audioCtx: AudioContext | null = null;

  return {
    canvas,
    start() {
      if (loopHandle) return;
      try {
        renderer = createRenderer(canvas);
      } catch (e) {
        log.warn('mini-game: renderer creation failed', e);
        return;
      }
      // Audio context creation is gated by the autoplay policy;
      // the companion page mini game is silent (no audio engine
      // wired up — the visitor is here for visuals).
      audioCtx = new (window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext!)();
      const clock = new AudioClock(audioCtx);
      input = createInput({ target: canvas });
      // Auto-play the title screen so the curvature is visible
      // without requiring keyboard input.
      let state = initialState();
      // Tap Enter once after a short delay so the title gives way
      // to a real wave (more interesting to watch).
      setTimeout(() => {
        const ev = new KeyboardEvent('keydown', { code: 'Enter' });
        canvas.dispatchEvent(ev);
      }, 1500);

      loopHandle = startGameLoop(state, {
        clock,
        input,
        render: (s) => {
          state = s;
          renderer!.draw(s);
        },
      });
    },
    dispose() {
      loopHandle?.stop();
      input?.dispose();
      renderer?.dispose();
      void audioCtx?.close();
      loopHandle = null;
      input = null;
      renderer = null;
      audioCtx = null;
    },
  };
}
