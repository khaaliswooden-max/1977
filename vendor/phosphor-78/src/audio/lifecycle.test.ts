import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupAudioLifecycle } from '@/audio/lifecycle';

class FakeAudioContext extends EventTarget {
  state: AudioContextState = 'suspended';
  resume = vi.fn(async () => {
    this.state = 'running';
    this.dispatchEvent(new Event('statechange'));
  });
  suspend = vi.fn(async () => {
    this.state = 'suspended';
    this.dispatchEvent(new Event('statechange'));
  });
}

describe('setupAudioLifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resumes ctx on first keydown and only once', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = new FakeAudioContext();
    const target = new EventTarget();
    setupAudioLifecycle(ctx as unknown as AudioContext, target);
    target.dispatchEvent(new Event('keydown'));
    target.dispatchEvent(new Event('keydown'));
    target.dispatchEvent(new Event('pointerdown'));
    // Allow the resume() promise + then() to resolve.
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.state).toBe('running');
  });

  it('resumes on first pointerdown if no keydown', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = new FakeAudioContext();
    const target = new EventTarget();
    setupAudioLifecycle(ctx as unknown as AudioContext, target);
    target.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('suspend()/resume() drive the ctx state', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = new FakeAudioContext();
    const target = new EventTarget();
    const handle = setupAudioLifecycle(
      ctx as unknown as AudioContext,
      target,
    );
    ctx.state = 'running';
    await handle.suspend();
    expect(ctx.suspend).toHaveBeenCalledTimes(1);
    ctx.state = 'suspended';
    await handle.resume();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('suspend() is a no-op when already suspended', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = new FakeAudioContext();
    ctx.state = 'suspended';
    const handle = setupAudioLifecycle(
      ctx as unknown as AudioContext,
      new EventTarget(),
    );
    await handle.suspend();
    expect(ctx.suspend).not.toHaveBeenCalled();
  });

  it('dispose() detaches gesture and statechange listeners', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const ctx = new FakeAudioContext();
    const target = new EventTarget();
    const handle = setupAudioLifecycle(
      ctx as unknown as AudioContext,
      target,
    );
    handle.dispose();
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    expect(ctx.resume).not.toHaveBeenCalled();
  });
});
