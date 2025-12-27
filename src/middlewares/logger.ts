import { Request, Response, NextFunction } from "express";
import winston from "winston";
import "winston-daily-rotate-file";

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};


const transport = new winston.transports.DailyRotateFile({
  filename: "logs/app-%DATE%.log", 
  datePattern: "YYYY-MM-DD",
  maxFiles: "7d",
  zippedArchive: true, 
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [transport, new winston.transports.Console()],
});


export const responseLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`[REQUEST] ${req.method} ${req.originalUrl}`);

  const oldJson = res.json;
  
  res.json = function (data) {
    // Log BEFORE calling the original json method
    logger.info(`[RESPONSE] Status: ${res.statusCode} Message: ${data.message}`);
    
    // Call the original method and return its result
    return oldJson.call(this, data);
  };

  next();
};