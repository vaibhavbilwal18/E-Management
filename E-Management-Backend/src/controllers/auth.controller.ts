import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { sendSuccess } from "../utils/apiResponse";
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  setCsrfCookie,
  clearCsrfCookie,
} from "../utils/cookies.util";
import { REFRESH_COOKIE_NAME } from "../constants/auth.constants";

function toPublicUser<T extends { passwordHash: string; resetPasswordToken?: unknown; resetPasswordExpires?: unknown }>(
  user: T,
) {
  const { passwordHash: _passwordHash, resetPasswordToken: _resetPasswordToken, resetPasswordExpires: _resetPasswordExpires, ...rest } = user;
  return rest;
}

function requestMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

export const authController = {
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body);
    sendSuccess(res, toPublicUser(user), "Registration successful", 201);
  },

  async login(req: Request, res: Response) {
    const { user, accessToken, refreshToken } = await authService.login(req.body, requestMeta(req));
    setRefreshTokenCookie(res, refreshToken, req.body.rememberMe);
    setCsrfCookie(res, req.body.rememberMe);
    sendSuccess(res, { user: toPublicUser(user), accessToken }, "Login successful");
  },

  async refresh(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const { user, accessToken, refreshToken, rememberMe } = await authService.refresh(
      rawToken,
      requestMeta(req),
    );
    setRefreshTokenCookie(res, refreshToken, rememberMe);
    setCsrfCookie(res, rememberMe);
    sendSuccess(res, { user: toPublicUser(user), accessToken }, "Token refreshed");
  },

  async logout(req: Request, res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await authService.logout(rawToken);
    clearRefreshTokenCookie(res);
    clearCsrfCookie(res);
    sendSuccess(res, null, "Logged out");
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, "If that email exists, a password reset link has been sent");
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, null, "Password reset successful");
  },

  async me(req: Request, res: Response) {
    const user = await authService.getById(req.user!.id);
    sendSuccess(res, toPublicUser(user));
  },
};
