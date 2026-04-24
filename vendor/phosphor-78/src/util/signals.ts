// ADR-006 + N2: Mini signal store, ~50 lines, zero deps.
//
// Game code reads `.value` synchronously; companion / boot code writes
// via `.set(v)`. Subscribers are called immediately on subscribe (so
// consumers can self-initialize) and again whenever the value actually
// changes (Object.is comparison).
//
// CR10 enforces direction: render/* and audio/* may subscribe + read
// only; companion/* and boot/* may write.

type Sub<T> = (value: T) => void;

export interface Signal<T> {
  readonly value: T;
  set(next: T): void;
  subscribe(fn: Sub<T>): () => void;
}

export function signal<T>(initial: T): Signal<T> {
  let current = initial;
  const subs = new Set<Sub<T>>();

  return {
    get value() {
      return current;
    },
    set(next: T) {
      if (Object.is(current, next)) return;
      current = next;
      // Iterate over a snapshot so a subscriber unsubscribing during
      // notification does not skip a peer.
      for (const fn of [...subs]) fn(current);
    },
    subscribe(fn: Sub<T>) {
      subs.add(fn);
      fn(current);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
