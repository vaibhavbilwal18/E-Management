import { randomBytes } from "node:crypto";
import { Response } from "express";
import { env, isProduction } from "../config/env";
import { CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from "../constants/auth.constants";

export function setRefreshTokenCookie(res: Response, token: string, rememberMe: boolean): void {
  const days = rememberMe
    ? env.JWT_REFRESH_EXPIRES_IN_DAYS_REMEMBER
    : env.JWT_REFRESH_EXPIRES_IN_DAYS;

  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
  });
}

// Double-submit cookie CSRF pattern: readable (non-httpOnly) so frontend JS can
// mirror it into a header on cookie-authenticated requests (refresh/logout) —
// a cross-site attacker can trigger the request but can't read the cookie to
// forge the matching header. Path is "/" (not REFRESH_COOKIE_PATH): document.cookie
// visibility is scoped to the *current page's* path, and frontend pages (e.g.
// /dashboard) never fall under /api/auth, so a narrower path would make it
// unreadable by the very JS that needs to read it. The browser still sends it
// correctly on requests to /api/auth/* since "/" is a prefix of every path.
export function setCsrfCookie(res: Response, rememberMe: boolean): void {
  const days = rememberMe
    ? env.JWT_REFRESH_EXPIRES_IN_DAYS_REMEMBER
    : env.JWT_REFRESH_EXPIRES_IN_DAYS;

  res.cookie(CSRF_COOKIE_NAME, randomBytes(32).toString("hex"), {
    httpOnly: false,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: days * 24 * 60 * 60 * 1000,
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
  });
}
