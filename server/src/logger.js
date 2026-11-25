import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve(import.meta.dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "server.log");

fs.mkdirSync(LOG_DIR, { recursive: true });

function write(level, message, details) {
  const ts = new Date().toISOString();
  const suffix = details ? ` | ${typeof details === "string" ? details : JSON.stringify(details)}` : "";
  const line = `[${ts}] [${level}] ${message}${suffix}\n`;

  if (level === "ERROR") {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }

  try {
    fs.appendFileSync(LOG_FILE, line, "utf-8");
  } catch {
    // Если файл лога временно занят, не роняем сервер
  }
}

export const logger = {
  info: (msg, details) => write("INFO", msg, details),
  warn: (msg, details) => write("WARN", msg, details),
  error: (msg, details) => write("ERROR", msg, details),
};
