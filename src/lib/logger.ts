const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const currentLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || "INFO";
const threshold = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.INFO;

function format(level: LogLevel, module: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${module}]`;
  if (data !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, data?: unknown) => {
      if (threshold <= LOG_LEVELS.DEBUG) console.log(format("DEBUG", module, msg, data));
    },
    info: (msg: string, data?: unknown) => {
      if (threshold <= LOG_LEVELS.INFO) console.log(format("INFO", module, msg, data));
    },
    warn: (msg: string, data?: unknown) => {
      if (threshold <= LOG_LEVELS.WARN) console.warn(format("WARN", module, msg, data));
    },
    error: (msg: string, data?: unknown) => {
      if (threshold <= LOG_LEVELS.ERROR) console.error(format("ERROR", module, msg, data));
    },
  };
}
