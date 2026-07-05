import { notificationRepository } from "../repositories/notification.repository";
import { buildPaginatedResult } from "../utils/pagination";
import type { ListNotificationsQuery } from "../validators/notification.validator";

export const notificationService = {
  async list(userId: string, query: ListNotificationsQuery) {
    const skip = (query.page - 1) * query.limit;

    const [items, total, unreadCount] = await Promise.all([
      notificationRepository.findManyForUser(userId, {
        unreadOnly: query.unread,
        skip,
        take: query.limit,
      }),
      notificationRepository.countForUser(userId, query.unread),
      notificationRepository.countUnread(userId),
    ]);

    return {
      ...buildPaginatedResult(items, total, { page: query.page, limit: query.limit }),
      unreadCount,
    };
  },

  markAsRead(id: string, userId: string) {
    return notificationRepository.markAsRead(id, userId);
  },

  markAllAsRead(userId: string) {
    return notificationRepository.markAllAsRead(userId);
  },
};
