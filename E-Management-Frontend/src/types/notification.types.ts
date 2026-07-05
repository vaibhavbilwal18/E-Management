export type NotificationType = "TASK_ASSIGNED" | "TASK_UPDATED" | "TASK_COMPLETED" | "TASK_DUE_SOON";

export interface Notification {
  id: string;
  userId: string;
  taskId: string | null;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface ListNotificationsParams {
  unread?: boolean;
  page?: number;
  limit?: number;
}
