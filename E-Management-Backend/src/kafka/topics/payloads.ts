import type { NotificationType } from "@prisma/client";

/** Published to task.assigned / task.updated / task.completed. */
export interface TaskEventPayload {
  taskId: string;
  userId: string;
  title: string;
  dueDate: string;
  message: string;
  notificationType: NotificationType;
}

/** Published to notification.created, after the notification row is persisted. */
export interface NotificationCreatedPayload {
  notificationId: string;
  userId: string;
  type: NotificationType;
  message: string;
}
