import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { initSocketIO } from "./sockets";
import { connectProducer, disconnectProducer } from "./kafka/producer/producer";
import { startNotificationConsumer, stopNotificationConsumer } from "./kafka/consumer/notification.consumer";
import { startSocketConsumer, stopSocketConsumer } from "./kafka/consumer/socket.consumer";
import { startEmailConsumer, stopEmailConsumer } from "./kafka/consumer/email.consumer";
import { startDueSoonJob } from "./jobs/dueSoonReminder.job";

const app = createApp();
const server = http.createServer(app);

let kafkaReady = false;

async function startKafka(): Promise<void> {
  try {
    await connectProducer();
    await startNotificationConsumer();
    await startSocketConsumer();
    await startEmailConsumer();
    kafkaReady = true;
  } catch (err) {
    // Notifications degrade gracefully — core CRUD APIs must stay up even if Kafka is unreachable.
    logger.error(`Kafka unavailable, notifications disabled: ${(err as Error).message}`);
  }
}

async function start() {
  await prisma.$connect();
  logger.info("Connected to PostgreSQL");

  await redis.connect();
  logger.info("Connected to Redis");

  initSocketIO(server);
  logger.info("Socket.io initialized");

  await startKafka();
  startDueSoonJob();

  server.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

async function shutdown(signal: string) {
  logger.info(`${signal} received: shutting down gracefully`);
  server.close(async () => {
    if (kafkaReady) {
      await Promise.all([stopNotificationConsumer(), stopSocketConsumer(), stopEmailConsumer()]);
      await disconnectProducer();
    }
    await prisma.$disconnect();
    redis.disconnect();
    logger.info("Shutdown complete");
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start().catch((err) => {
  logger.error(`Failed to start server: ${(err as Error).message}`);
  process.exit(1);
});
