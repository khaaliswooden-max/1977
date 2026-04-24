// CC1 + CR8: structured Result type for recoverable errors.
// Throws are reserved for invariant violations (see CR9).

export type Result<T, E = Error> =
  | { kind: 'ok'; value: T }
  | { kind: 'err'; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ kind: 'ok', value });

export const err = <E>(error: E): Result<never, E> => ({ kind: 'err', error });

export const isOk = <T, E>(
  r: Result<T, E>,
): r is { kind: 'ok'; value: T } => r.kind === 'ok';

export const isErr = <T, E>(
  r: Result<T, E>,
): r is { kind: 'err'; error: E } => r.kind === 'err';
