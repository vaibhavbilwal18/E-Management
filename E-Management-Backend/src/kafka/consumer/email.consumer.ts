import type { Consumer } from "kafkajs";
import { kafka } from "../config";
import { KAFKA_TOPICS } from "../topics";
import { userRepository } from "../../repositories/user.repository";
import { sendTaskNotificationEmail } from "../../emails/mailer";
import { logger } from "../../config/logger";
import type { NotificationCreatedPayload } from "../topics/payloads";

let consumer: Consumer | null = null;

export async function startEmailConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: "email-consumer" });
  await consumer.connect();
  await consumer.subscribe({ topics: [KAFKA_TOPICS.NOTIFICATION_CREATED], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString()) as NotificationCreatedPayload;
        const user = await userRepository.findById(payload.userId);
        if (user) {
          await sendTaskNotificationEmail(user.email, payload.message);
        }
      } catch (err) {
        logger.error(`Email consumer failed to process message: ${(err as Error).message}`);
      }
    },
  });

  logger.info("Email consumer running");
}

export async function stopEmailConsumer(): Promise<void> {
  await consumer?.disconnect();
}
