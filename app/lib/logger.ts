type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

function emit(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(output);
  } else if (entry.level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug(message: string, data?: Record<string, unknown>) {
    if (shouldLog("debug")) emit(formatEntry("debug", message, data));
  },
  info(message: string, data?: Record<string, unknown>) {
    if (shouldLog("info")) emit(formatEntry("info", message, data));
  },
  warn(message: string, data?: Record<string, unknown>) {
    if (shouldLog("warn")) emit(formatEntry("warn", message, data));
  },
  error(message: string, data?: Record<string, unknown>) {
    if (shouldLog("error")) emit(formatEntry("error", message, data));
  },
};
