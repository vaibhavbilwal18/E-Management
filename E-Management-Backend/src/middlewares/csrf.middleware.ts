import { NextFunction, Request, Response } from "express";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, REFRESH_COOKIE_NAME } from "../constants/auth.constants";
import { AppError } from "../utils/AppError";

// Applied only to the two endpoints that authenticate purely via cookie
// (refresh/logout) — every other route requires an Authorization bearer
// token, which a cross-site request cannot forge regardless of cookies.
export function verifyCsrf(req: Request, _res: Response, next: NextFunction) {
  // No session cookie at all (e.g. a visitor's first-ever load) isn't a CSRF
  // case — let it fall through to the normal "missing refresh token" 401
  // instead of a misleading CSRF error.
  if (!req.cookies?.[REFRESH_COOKIE_NAME]) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw AppError.forbidden("Invalid or missing CSRF token");
  }

  next();
}
