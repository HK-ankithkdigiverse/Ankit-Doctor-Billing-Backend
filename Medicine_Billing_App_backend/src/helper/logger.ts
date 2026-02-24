type LogLevel = "info" | "warn" | "error";

const writeLog = (level: LogLevel, message: string, meta?: unknown) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    meta,
  };

  const out = JSON.stringify(payload);
  if (level === "error") {
    console.error(out);
    return;
  }
  if (level === "warn") {
    console.warn(out);
    return;
  }
  console.log(out);
};

export const logger = {
  info: (message: string, meta?: unknown) => writeLog("info", message, meta),
  warn: (message: string, meta?: unknown) => writeLog("warn", message, meta),
  error: (message: string, meta?: unknown) => writeLog("error", message, meta),
};

