import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { sendError } from "../utils/apiResponse";

// Automated tests fire many rapid requests from one source; rate limiting is
// a production/dev concern and shouldn't make the suite flaky or require
// artificial delays between test cases.
const skip = () => env.NODE_ENV === "test";

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: (_req, res) => {
    sendError(res, "Too many requests, please try again later", 429);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: (_req, res) => {
    sendError(res, "Too many attempts, please try again later", 429);
  },
});

// Tighter than authRateLimiter: login is the highest-value brute-force target,
// so it gets its own stricter budget independent of register/forgot/reset.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  handler: (_req, res) => {
    sendError(res, "Too many login attempts, please try again later", 429);
  },
});
