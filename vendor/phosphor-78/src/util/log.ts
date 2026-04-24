// CC2: minimal 4-level logger. Hot paths must NOT log.
// `debug` is a noop in production builds (tree-shaken via Vite's
// import.meta.env.DEV constant).

type LogFn = (...args: unknown[]) => void;

interface Logger {
  error: LogFn;
  warn: LogFn;
  info: LogFn;
  debug: LogFn;
}

const PREFIX = '[phosphor]';
const DBG_PREFIX = '[phosphor:dbg]';

const noop: LogFn = () => {};

export const log: Logger = {
  error: (...args) => console.error(PREFIX, ...args),
  warn: (...args) => console.warn(PREFIX, ...args),
  info: (...args) => console.log(PREFIX, ...args),
  debug: import.meta.env.DEV
    ? (...args) => console.log(DBG_PREFIX, ...args)
    : noop,
};
