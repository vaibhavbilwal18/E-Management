import { NotificationType } from "@prisma/client";
import { KAFKA_TOPICS } from "../topics";
import { publishEvent } from "./producer";
import { logger } from "../../config/logger";
import type { TaskEventPayload } from "../topics/payloads";

type TaskEventInput = Omit<TaskEventPayload, "notificationType">;

async function safePublish(topic: (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS], payload: TaskEventPayload) {
  try {
    await publishEvent(topic, payload);
  } catch (err) {
    // Notifications are a best-effort side effect — a Kafka hiccup must never fail the task mutation itself.
    logger.error(`Failed to publish to ${topic}: ${(err as Error).message}`);
  }
}

export function publishTaskAssigned(payload: TaskEventInput): Promise<void> {
  return safePublish(KAFKA_TOPICS.TASK_ASSIGNED, {
    ...payload,
    notificationType: NotificationType.TASK_ASSIGNED,
  });
}

export function publishTaskUpdated(payload: TaskEventInput): Promise<void> {
  return safePublish(KAFKA_TOPICS.TASK_UPDATED, {
    ...payload,
    notificationType: NotificationType.TASK_UPDATED,
  });
}

export function publishTaskCompleted(payload: TaskEventInput): Promise<void> {
  return safePublish(KAFKA_TOPICS.TASK_COMPLETED, {
    ...payload,
    notificationType: NotificationType.TASK_COMPLETED,
  });
}

export function publishTaskDueSoon(payload: TaskEventInput): Promise<void> {
  // Reuses the task.assigned topic — the consumer dispatches on `notificationType`,
  // not the topic name, so a dedicated topic would add nothing here.
  return safePublish(KAFKA_TOPICS.TASK_ASSIGNED, {
    ...payload,
    notificationType: NotificationType.TASK_DUE_SOON,
  });
}
