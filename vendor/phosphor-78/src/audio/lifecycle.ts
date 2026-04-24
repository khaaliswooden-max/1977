// CC6 + FR26: AudioContext lifecycle.
// - autoplay unlock on first user gesture
// - explicit suspend/resume that the pause path can call
// - logs state transitions

import { log } from '@/util/log';

export interface LifecycleHandle {
  /** Manually suspend (used by pause path). */
  suspend(): Promise<void>;
  /** Manually resume (used by pause-resume path). */
  resume(): Promise<void>;
  /** Detach all listeners. */
  dispose(): void;
}

/**
 * Wire up an AudioContext so it auto-resumes on the first user
 * gesture (browsers require this). After unlock, the returned handle
 * can be used to suspend/resume from the pause state machine.
 */
export function setupAudioLifecycle(
  ctx: AudioContext,
  target: EventTarget = document,
): LifecycleHandle {
  let unlocked = false;

  const onGesture = () => {
    if (unlocked) return;
    unlocked = true;
    detachUnlock();
    void ctx.resume().then(() => {
      log.info(`audio context unlocked (state=${ctx.state})`);
    });
  };

  const detachUnlock = () => {
    target.removeEventListener('keydown', onGesture);
    target.removeEventListener('pointerdown', onGesture);
    target.removeEventListener('touchstart', onGesture);
  };

  target.addEventListener('keydown', onGesture, { once: false });
  target.addEventListener('pointerdown', onGesture, { once: false });
  target.addEventListener('touchstart', onGesture, { once: false });

  const onStateChange = () => {
    log.info(`audio context state -> ${ctx.state}`);
  };
  ctx.addEventListener('statechange', onStateChange);

  return {
    async suspend() {
      if (ctx.state === 'running') await ctx.suspend();
    },
    async resume() {
      if (ctx.state === 'suspended') await ctx.resume();
    },
    dispose() {
      detachUnlock();
      ctx.removeEventListener('statechange', onStateChange);
    },
  };
}
