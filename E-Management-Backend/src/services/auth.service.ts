import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { refreshTokenRepository } from "../repositories/refreshToken.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { hashPassword, comparePassword } from "../utils/hash.util";
import { signAccessToken, generateRefreshToken, hashToken } from "../utils/jwt.util";
import { AppError } from "../utils/AppError";
import { RESET_TOKEN_EXPIRY_MINUTES } from "../constants/auth.constants";
import { sendPasswordResetEmail } from "../emails/mailer";
import type { RegisterInput, LoginInput } from "../validators/auth.validator";

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

async function issueTokenPair(userId: string, role: Role, rememberMe: boolean, meta: RequestMeta) {
  const accessToken = signAccessToken({ sub: userId, role });
  const { rawToken, tokenHash } = generateRefreshToken();
  const days = rememberMe
    ? env.JWT_REFRESH_EXPIRES_IN_DAYS_REMEMBER
    : env.JWT_REFRESH_EXPIRES_IN_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await refreshTokenRepository.create({
    userId,
    tokenHash,
    rememberMe,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return { accessToken, refreshToken: rawToken, refreshTokenHash: tokenHash };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict("An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const user = await userRepository.create(
        {
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          role: Role.EMPLOYEE,
        },
        tx,
      );

      await employeeRepository.create(
        {
          department: input.department,
          designation: input.designation,
          user: { connect: { id: user.id } },
        },
        tx,
      );

      await auditLogRepository.create(
        { userId: user.id, action: "CREATE", entity: "Auth", entityId: user.id },
        tx,
      );

      return user;
    });
  },

  async login(input: LoginInput, meta: RequestMeta) {
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const tokens = await issueTokenPair(user.id, user.role, input.rememberMe, meta);
    await auditLogRepository.create({ userId: user.id, action: "LOGIN", entity: "Auth" });

    return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  },

  async refresh(rawToken: string | undefined, meta: RequestMeta) {
    if (!rawToken) {
      throw AppError.unauthorized("Missing refresh token");
    }

    const tokenHash = hashToken(rawToken);
    const existing = await refreshTokenRepository.findByHash(tokenHash);

    if (!existing) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    if (existing.revoked) {
      // Reuse of an already-rotated token: treat as possible theft and kill the whole chain.
      await refreshTokenRepository.revokeAllForUser(existing.userId);
      throw AppError.unauthorized("Refresh token has already been used");
    }

    if (existing.expiresAt < new Date()) {
      throw AppError.unauthorized("Refresh token expired");
    }

    const user = await userRepository.findById(existing.userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized("Invalid refresh token");
    }

    const tokens = await issueTokenPair(user.id, user.role, existing.rememberMe, meta);
    await refreshTokenRepository.revoke(existing.id, tokens.refreshTokenHash);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      rememberMe: existing.rememberMe,
    };
  },

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);
    const existing = await refreshTokenRepository.findByHash(tokenHash);
    if (existing && !existing.revoked) {
      await refreshTokenRepository.revoke(existing.id);
      await auditLogRepository.create({ userId: existing.userId, action: "LOGOUT", entity: "Auth" });
    }
  },

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    // Do not reveal whether the email exists.
    if (!user) return;

    const { rawToken, tokenHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await userRepository.setResetToken(user.id, tokenHash, expiresAt);

    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  },

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const user = await userRepository.findByResetToken(tokenHash);
    if (!user) {
      throw AppError.badRequest("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(newPassword);
    await userRepository.updatePassword(user.id, passwordHash);
    await refreshTokenRepository.revokeAllForUser(user.id);
    await auditLogRepository.create({
      userId: user.id,
      action: "PASSWORD_RESET",
      entity: "Auth",
    });
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return user;
  },
};
