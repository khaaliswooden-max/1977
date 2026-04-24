import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { log } from '@/util/log';

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('error() writes to console.error with prefix', () => {
    log.error('boom', 42);
    expect(console.error).toHaveBeenCalledWith('[phosphor]', 'boom', 42);
  });

  it('warn() writes to console.warn with prefix', () => {
    log.warn('careful');
    expect(console.warn).toHaveBeenCalledWith('[phosphor]', 'careful');
  });

  it('info() writes to console.log with prefix', () => {
    log.info('boot');
    expect(console.log).toHaveBeenCalledWith('[phosphor]', 'boot');
  });

  it('debug() writes to console.log in DEV (test runs in dev mode)', () => {
    // Vitest sets import.meta.env.DEV === true by default; in production
    // builds Vite tree-shakes the body to noop. We assert the dev path.
    expect(import.meta.env.DEV).toBe(true);
    log.debug('trace');
    expect(console.log).toHaveBeenCalledWith('[phosphor:dbg]', 'trace');
  });
});
