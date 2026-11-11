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

// Strip CR/LF/NUL so a user-controlled value can never forge additional log
// lines. Callers may interpolate request data into `msg`, so sanitizing here is
// the single choke point that keeps every log line intact.
function sanitizeLogMessage(value: string): string {
  return value.replace(/[\r\n\u0000]/g, "");
}

function sanitizeArg(arg: unknown): unknown {
  return typeof arg === "string" ? sanitizeLogMessage(arg) : arg;
}

export function createLogger(tag: string) {
  const safeTag = sanitizeLogMessage(tag);
  return {
    debug: (msg: string, ...args: unknown[]) => {
      if (shouldLog("debug")) console.debug(`[${safeTag}] ${sanitizeLogMessage(msg)}`, ...args.map(sanitizeArg));
    },
    info: (msg: string, ...args: unknown[]) => {
      if (shouldLog("info")) console.info(`[${safeTag}] ${sanitizeLogMessage(msg)}`, ...args.map(sanitizeArg));
    },
    warn: (msg: string, ...args: unknown[]) => {
      if (shouldLog("warn")) console.warn(`[${safeTag}] ${sanitizeLogMessage(msg)}`, ...args.map(sanitizeArg));
    },
    error: (msg: string, ...args: unknown[]) => {
      console.error(`[${safeTag}] ${sanitizeLogMessage(msg)}`, ...args.map(sanitizeArg));
    },
  };
}

export type Logger = ReturnType<typeof createLogger>;
