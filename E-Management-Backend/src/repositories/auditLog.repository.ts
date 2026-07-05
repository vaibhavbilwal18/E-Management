import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

export const auditLogRepository = {
  create(data: Prisma.AuditLogUncheckedCreateInput, client: Client = prisma) {
    return client.auditLog.create({ data });
  },
};
