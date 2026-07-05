import path from "path";
import winston from "winston";
import { isProduction } from "./env";

const logsDir = path.join(__dirname, "..", "logs");

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return `${ts} [${level}]: ${stack ?? message}`;
  }),
);

export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "access.log"),
    }),
  ],
});

if (!isProduction) {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
}
