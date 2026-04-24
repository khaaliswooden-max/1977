// FR1-5, FR19: keyboard -> per-frame InputSnapshot.
//
// We translate raw key events into a held-keys map and expose a
// snapshot() that the loop reads each tick. event.repeat is ignored
// so holding fire does not auto-burst (the OS key-repeat rate is
// platform-dependent and would couple to gameplay timing).

import type { InputSnapshot } from '@/types/input';

export type InputAction = keyof InputSnapshot;

export interface InputReader {
  snapshot(): InputSnapshot;
  dispose(): void;
}

export interface InputOptions {
  readonly target?: EventTarget;
}

const KEY_MAP: Readonly<Record<string, InputAction>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire',
  KeyW: 'fire',
  ArrowUp: 'fire',
  KeyP: 'pause',
  Escape: 'pause',
  Enter: 'confirm',
};

export function createInput(opts: InputOptions = {}): InputReader {
  const target = opts.target ?? globalThis.window ?? globalThis;
  const held: Record<InputAction, boolean> = {
    left: false,
    right: false,
    fire: false,
    pause: false,
    confirm: false,
  };

  const onKeyDown = (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.repeat) return;
    const action = KEY_MAP[ke.code];
    if (!action) return;
    held[action] = true;
  };

  const onKeyUp = (e: Event) => {
    const ke = e as KeyboardEvent;
    const action = KEY_MAP[ke.code];
    if (!action) return;
    held[action] = false;
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);

  return {
    snapshot(): InputSnapshot {
      // Return a frozen copy so the reducer cannot mutate the
      // held-keys map.
      return {
        left: held.left,
        right: held.right,
        fire: held.fire,
        pause: held.pause,
        confirm: held.confirm,
      };
    },
    dispose() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
    },
  };
}
