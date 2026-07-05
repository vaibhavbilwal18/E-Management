import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

export const notificationRepository = {
  create(data: Prisma.NotificationUncheckedCreateInput, client: Client = prisma) {
    return client.notification.create({ data });
  },

  findManyForUser(userId: string, opts: { unreadOnly?: boolean; skip: number; take: number }) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (opts.unreadOnly) where.isRead = false;

    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opts.skip,
      take: opts.take,
    });
  },

  countForUser(userId: string, unreadOnly?: boolean) {
    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) where.isRead = false;
    return prisma.notification.count({ where });
  },

  countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },

  markAllAsRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  },

  existsDueSoonForTask(taskId: string) {
    return prisma.notification.findFirst({
      where: { taskId, type: NotificationType.TASK_DUE_SOON },
    });
  },
};
