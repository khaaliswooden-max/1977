import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, ok, type Result } from '@/util/result';

describe('Result type guards', () => {
  it('ok() builds an ok-variant', () => {
    const r = ok(42);
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.value).toBe(42);
    }
  });

  it('err() builds an err-variant', () => {
    const e = new Error('boom');
    const r = err(e);
    expect(r.kind).toBe('err');
    if (r.kind === 'err') {
      expect(r.error).toBe(e);
    }
  });

  it('isOk narrows to ok', () => {
    const r: Result<number, string> = ok(7);
    if (isOk(r)) {
      expect(r.value).toBe(7);
    } else {
      throw new Error('isOk should have narrowed');
    }
  });

  it('isErr narrows to err', () => {
    const r: Result<number, string> = err('nope');
    if (isErr(r)) {
      expect(r.error).toBe('nope');
    } else {
      throw new Error('isErr should have narrowed');
    }
  });

  it('isOk and isErr are mutually exclusive', () => {
    const r1: Result<number, string> = ok(1);
    const r2: Result<number, string> = err('x');
    expect(isOk(r1)).toBe(true);
    expect(isErr(r1)).toBe(false);
    expect(isOk(r2)).toBe(false);
    expect(isErr(r2)).toBe(true);
  });

  it('supports custom error types', () => {
    interface NetworkError {
      code: number;
      reason: string;
    }
    const r: Result<string, NetworkError> = err({ code: 503, reason: 'down' });
    if (isErr(r)) {
      expect(r.error.code).toBe(503);
      expect(r.error.reason).toBe('down');
    }
  });
});
