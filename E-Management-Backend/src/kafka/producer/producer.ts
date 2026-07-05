import { kafka } from "../config";
import { logger } from "../../config/logger";
import type { KafkaTopic } from "../topics";

const producer = kafka.producer();
let isConnected = false;

export async function connectProducer(): Promise<void> {
  if (isConnected) return;
  await producer.connect();
  isConnected = true;
  logger.info("Kafka producer connected");
}

export async function disconnectProducer(): Promise<void> {
  if (!isConnected) return;
  await producer.disconnect();
  isConnected = false;
}

export async function publishEvent(topic: KafkaTopic, payload: unknown): Promise<void> {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  });
}
