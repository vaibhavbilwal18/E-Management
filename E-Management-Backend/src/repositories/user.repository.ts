import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

const withEmployee = { employee: true } satisfies Prisma.UserInclude;

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: withEmployee });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: withEmployee });
  },

  create(data: Prisma.UserCreateInput, client: Client = prisma) {
    return client.user.create({ data });
  },

  findByResetToken(resetPasswordToken: string) {
    return prisma.user.findFirst({
      where: { resetPasswordToken, resetPasswordExpires: { gt: new Date() } },
    });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
    });
  },

  setResetToken(id: string, resetPasswordToken: string, resetPasswordExpires: Date) {
    return prisma.user.update({
      where: { id },
      data: { resetPasswordToken, resetPasswordExpires },
    });
  },
};
