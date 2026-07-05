import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { sendError } from "../utils/apiResponse";
import { logger } from "../config/logger";
import { isProduction, env } from "../config/env";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    logger.warn(`Validation error on ${req.method} ${req.originalUrl}: ${err.message}`);
    sendError(res, "Validation failed", 422, err.flatten().fieldErrors);
    return;
  }

  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      sendError(res, `File exceeds the ${env.MAX_FILE_SIZE_MB}MB limit`, 413);
      return;
    }
    sendError(res, err.message, 400);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      sendError(res, `A record with this ${(err.meta?.target as string[])?.join(", ")} already exists`, 409);
      return;
    }
    if (err.code === "P2025") {
      sendError(res, "Record not found", 404);
      return;
    }
    logger.error(`Prisma error [${err.code}]: ${err.message}`);
    sendError(res, "Database error", 500);
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(err.stack ?? err.message);
    }
    sendError(res, err.message, err.statusCode, err.details ?? null);
    return;
  }

  const error = err as Error;
  logger.error(error.stack ?? error.message ?? "Unknown error");
  sendError(res, isProduction ? "Internal server error" : error.message, 500);
}
