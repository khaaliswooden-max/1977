import { describe, expect, it } from 'vitest';
import { createInput } from '@/game/input';

class FakeTarget extends EventTarget {
  press(code: string, repeat = false) {
    const ev = new Event('keydown') as Event & {
      code: string;
      repeat: boolean;
    };
    ev.code = code;
    ev.repeat = repeat;
    this.dispatchEvent(ev);
  }
  release(code: string) {
    const ev = new Event('keyup') as Event & { code: string };
    ev.code = code;
    this.dispatchEvent(ev);
  }
}

describe('createInput', () => {
  it('starts neutral', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    expect(input.snapshot()).toEqual({
      left: false,
      right: false,
      fire: false,
      pause: false,
      confirm: false,
    });
    input.dispose();
  });

  it('Arrow keys map to left/right/fire', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('ArrowLeft');
    expect(input.snapshot().left).toBe(true);
    target.press('ArrowRight');
    expect(input.snapshot().right).toBe(true);
    target.press('ArrowUp');
    expect(input.snapshot().fire).toBe(true);
    target.release('ArrowLeft');
    expect(input.snapshot().left).toBe(false);
    input.dispose();
  });

  it('WASD-ish (A/D/W) also map to left/right/fire', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('KeyA');
    target.press('KeyD');
    target.press('KeyW');
    const s = input.snapshot();
    expect(s.left).toBe(true);
    expect(s.right).toBe(true);
    expect(s.fire).toBe(true);
    input.dispose();
  });

  it('Space maps to fire', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('Space');
    expect(input.snapshot().fire).toBe(true);
    input.dispose();
  });

  it('P and Escape both map to pause', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('KeyP');
    expect(input.snapshot().pause).toBe(true);
    target.release('KeyP');
    expect(input.snapshot().pause).toBe(false);
    target.press('Escape');
    expect(input.snapshot().pause).toBe(true);
    input.dispose();
  });

  it('Enter maps to confirm', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('Enter');
    expect(input.snapshot().confirm).toBe(true);
    input.dispose();
  });

  it('event.repeat is ignored (no auto-burst)', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.release('Space');
    target.press('Space', true);
    // First repeat=true event should have no effect because we never
    // got a non-repeat keydown.
    expect(input.snapshot().fire).toBe(false);
    target.press('Space', false);
    expect(input.snapshot().fire).toBe(true);
    input.dispose();
  });

  it('unknown keys are ignored', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('KeyQ');
    target.press('F1');
    expect(input.snapshot()).toEqual({
      left: false,
      right: false,
      fire: false,
      pause: false,
      confirm: false,
    });
    input.dispose();
  });

  it('snapshot returns a fresh copy each call', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    target.press('ArrowLeft');
    const a = input.snapshot();
    const b = input.snapshot();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    input.dispose();
  });

  it('dispose() detaches listeners', () => {
    const target = new FakeTarget();
    const input = createInput({ target });
    input.dispose();
    target.press('ArrowLeft');
    expect(input.snapshot().left).toBe(false);
  });
});
