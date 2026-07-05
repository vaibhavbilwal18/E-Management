import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

const withRelations = { uploadedBy: true } satisfies Prisma.FileInclude;

export type FileWithRelations = Prisma.FileGetPayload<{ include: typeof withRelations }>;

export const fileRepository = {
  create(data: Prisma.FileUncheckedCreateInput, client: Client = prisma) {
    return client.file.create({ data, include: withRelations });
  },

  findById(id: string): Promise<FileWithRelations | null> {
    return prisma.file.findUnique({ where: { id }, include: withRelations });
  },

  findManyByTaskId(taskId: string): Promise<FileWithRelations[]> {
    return prisma.file.findMany({
      where: { taskId },
      include: withRelations,
      orderBy: { createdAt: "desc" },
    });
  },

  delete(id: string, client: Client = prisma) {
    return client.file.delete({ where: { id } });
  },
};
