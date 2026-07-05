export const KAFKA_TOPICS = {
  TASK_CREATED: "task.created",
  TASK_ASSIGNED: "task.assigned",
  TASK_UPDATED: "task.updated",
  TASK_COMPLETED: "task.completed",
  NOTIFICATION_CREATED: "notification.created",
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
