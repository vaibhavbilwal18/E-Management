import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const refreshTokenRepository = {
  create(data: Prisma.RefreshTokenUncheckedCreateInput) {
    return prisma.refreshToken.create({ data });
  },

  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revoke(id: string, replacedBy?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked: true, replacedBy },
    });
  },

  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  },
};
