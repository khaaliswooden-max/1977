import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPauseController, pauseState } from '@/game/pause';

class FakeDoc extends EventTarget {
  hidden = false;
  setHidden(v: boolean) {
    this.hidden = v;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

class FakeWin extends EventTarget {
  blur() {
    this.dispatchEvent(new Event('blur'));
  }
}

describe('createPauseController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    pauseState.set({ paused: false, reason: null });
  });

  it('starts unpaused', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctrl = createPauseController({
      doc: null,
      win: null,
    });
    expect(ctrl.isPaused()).toBe(false);
    expect(ctrl.reason()).toBeNull();
    ctrl.dispose();
  });

  it('pause(reason) flips state and updates pauseState signal', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctrl = createPauseController({ doc: null, win: null });
    ctrl.pause('manual');
    expect(ctrl.isPaused()).toBe(true);
    expect(ctrl.reason()).toBe('manual');
    expect(pauseState.value.paused).toBe(true);
    expect(pauseState.value.reason).toBe('manual');
    ctrl.dispose();
  });

  it('second pause is a no-op', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const onPause = vi.fn();
    const ctrl = createPauseController({
      doc: null,
      win: null,
      hooks: { onPause },
    });
    ctrl.pause('manual');
    ctrl.pause('manual');
    expect(onPause).toHaveBeenCalledTimes(1);
    ctrl.dispose();
  });

  it('resume only fires when actually paused', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const onResume = vi.fn();
    const ctrl = createPauseController({
      doc: null,
      win: null,
      hooks: { onResume },
    });
    ctrl.resume(); // not paused; no-op
    expect(onResume).not.toHaveBeenCalled();
    ctrl.pause('manual');
    ctrl.resume();
    expect(onResume).toHaveBeenCalledTimes(1);
    ctrl.dispose();
  });

  it('visibilitychange (hidden=true) auto-pauses', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fakeDoc = new FakeDoc();
    const ctrl = createPauseController({
      doc: fakeDoc as unknown as Document,
      win: null,
    });
    fakeDoc.setHidden(true);
    expect(ctrl.isPaused()).toBe(true);
    expect(ctrl.reason()).toBe('visibility');
    ctrl.dispose();
  });

  it('visibilitychange (hidden=false) does NOT auto-resume', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fakeDoc = new FakeDoc();
    const ctrl = createPauseController({
      doc: fakeDoc as unknown as Document,
      win: null,
    });
    fakeDoc.setHidden(true);
    expect(ctrl.isPaused()).toBe(true);
    fakeDoc.setHidden(false);
    expect(ctrl.isPaused()).toBe(true); // still paused — manual resume only
    ctrl.dispose();
  });

  it('window blur auto-pauses', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fakeWin = new FakeWin();
    const ctrl = createPauseController({
      doc: null,
      win: fakeWin as unknown as Window,
    });
    fakeWin.blur();
    expect(ctrl.isPaused()).toBe(true);
    expect(ctrl.reason()).toBe('blur');
    ctrl.dispose();
  });

  it('dispose detaches listeners and resets state', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fakeDoc = new FakeDoc();
    const ctrl = createPauseController({
      doc: fakeDoc as unknown as Document,
      win: null,
    });
    ctrl.pause('manual');
    ctrl.dispose();
    expect(pauseState.value.paused).toBe(false);
    fakeDoc.setHidden(true);
    expect(ctrl.isPaused()).toBe(false);
  });
});
