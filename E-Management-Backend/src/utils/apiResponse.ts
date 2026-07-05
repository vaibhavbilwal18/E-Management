import { Response } from "express";

interface ApiResponseBody<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export function sendSuccess<T>(
  res: Response,
  data: T | null = null,
  message = "Success",
  statusCode = 200,
): Response<ApiResponseBody<T>> {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  data: unknown = null,
): Response<ApiResponseBody<unknown>> {
  return res.status(statusCode).json({ success: false, message, data });
}
