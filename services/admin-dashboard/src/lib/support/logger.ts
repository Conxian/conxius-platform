/**
 * Structured logger — replaces console.* calls in production code.
 *
 * Wraps console methods with level gating. In production, debug/info are
 * no-ops; warn/error always emit. Prefixes messages with a service tag
 * for filtering in log aggregation.
 */

const LOG_LEVEL = (process.env.NEXT_PUBLIC_LOG_LEVEL || "warn") as
  | "debug"
  | "info"
  | "warn"
  | "error";

const LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.warn;

function shouldLog(level: string): boolean {
  return (LEVELS[level] ?? 99) >= currentLevel;
}

export function createLogger(tag: string) {
  return {
    debug: (msg: string, ...args: unknown[]) => {
      if (shouldLog("debug")) console.debug(`[${tag}] ${msg}`, ...args);
    },
    info: (msg: string, ...args: unknown[]) => {
      if (shouldLog("info")) console.info(`[${tag}] ${msg}`, ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (shouldLog("warn")) console.warn(`[${tag}] ${msg}`, ...args);
    },
    error: (msg: string, ...args: unknown[]) => {
      console.error(`[${tag}] ${msg}`, ...args);
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
