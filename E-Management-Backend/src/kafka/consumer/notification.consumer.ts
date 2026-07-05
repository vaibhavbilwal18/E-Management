import type { Consumer } from "kafkajs";
import { kafka } from "../config";
import { KAFKA_TOPICS } from "../topics";
import { notificationRepository } from "../../repositories/notification.repository";
import { publishEvent } from "../producer/producer";
import { logger } from "../../config/logger";
import type { TaskEventPayload } from "../topics/payloads";

let consumer: Consumer | null = null;

export async function startNotificationConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: "notification-consumer" });
  await consumer.connect();
  await consumer.subscribe({
    topics: [KAFKA_TOPICS.TASK_ASSIGNED, KAFKA_TOPICS.TASK_UPDATED, KAFKA_TOPICS.TASK_COMPLETED],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString()) as TaskEventPayload;

        const notification = await notificationRepository.create({
          userId: payload.userId,
          taskId: payload.taskId,
          type: payload.notificationType,
          message: payload.message,
        });

        await publishEvent(KAFKA_TOPICS.NOTIFICATION_CREATED, {
          notificationId: notification.id,
          userId: notification.userId,
          type: notification.type,
          message: notification.message,
        });

        logger.info(`Notification created from ${topic} for user ${payload.userId}`);
      } catch (err) {
        logger.error(`Notification consumer failed to process message: ${(err as Error).message}`);
      }
    },
  });

  logger.info("Notification consumer running");
}

export async function stopNotificationConsumer(): Promise<void> {
  await consumer?.disconnect();
}
