import type { Consumer } from "kafkajs";
import { kafka } from "../config";
import { KAFKA_TOPICS } from "../topics";
import { emitToUser } from "../../sockets";
import { logger } from "../../config/logger";
import type { NotificationCreatedPayload } from "../topics/payloads";

let consumer: Consumer | null = null;

export async function startSocketConsumer(): Promise<void> {
  consumer = kafka.consumer({ groupId: "socket-gateway-consumer" });
  await consumer.connect();
  await consumer.subscribe({ topics: [KAFKA_TOPICS.NOTIFICATION_CREATED], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      try {
        const payload = JSON.parse(message.value.toString()) as NotificationCreatedPayload;
        emitToUser(payload.userId, "notification:new", payload);
      } catch (err) {
        logger.error(`Socket consumer failed to process message: ${(err as Error).message}`);
      }
    },
  });

  logger.info("Socket gateway consumer running");
}

export async function stopSocketConsumer(): Promise<void> {
  await consumer?.disconnect();
}
