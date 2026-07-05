import cron from "node-cron";
import { TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { notificationRepository } from "../repositories/notification.repository";
import { publishTaskDueSoon } from "../kafka/producer/taskEvents";
import { logger } from "../config/logger";

const CRON_SCHEDULE = "0 * * * *"; // hourly

export async function runDueSoonSweep(): Promise<number> {
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: TaskStatus.COMPLETED },
      dueDate: { lte: in24h, gte: new Date() },
    },
    include: { assignedTo: { include: { user: true } } },
  });

  let notified = 0;

  for (const task of tasks) {
    const alreadyNotified = await notificationRepository.existsDueSoonForTask(task.id);
    if (alreadyNotified) continue;

    await publishTaskDueSoon({
      taskId: task.id,
      userId: task.assignedTo.user.id,
      title: task.title,
      dueDate: task.dueDate.toISOString(),
      message: `Task "${task.title}" is due soon (${task.dueDate.toLocaleDateString()})`,
    });

    notified += 1;
  }

  if (notified > 0) {
    logger.info(`Due-soon sweep: notified ${notified} task(s) of ${tasks.length} candidate(s)`);
  }

  return notified;
}

export function startDueSoonJob(): void {
  cron.schedule(CRON_SCHEDULE, () => {
    runDueSoonSweep().catch((err) => {
      logger.error(`Due-soon sweep failed: ${(err as Error).message}`);
    });
  });
  logger.info(`Due-soon reminder cron scheduled (${CRON_SCHEDULE})`);
}
