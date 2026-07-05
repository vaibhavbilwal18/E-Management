import { TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

export const dashboardRepository = {
  countActiveEmployees(): Promise<number> {
    return prisma.employee.count({ where: { isDeleted: false } });
  },

  countTotalTasks(): Promise<number> {
    return prisma.task.count();
  },

  tasksByStatus(where: { assignedToId?: string } = {}) {
    return prisma.task.groupBy({ by: ["status"], where, _count: { _all: true } });
  },

  countOverdueTasks(where: { assignedToId?: string } = {}): Promise<number> {
    return prisma.task.count({
      where: { ...where, status: { not: TaskStatus.COMPLETED }, dueDate: { lt: new Date() } },
    });
  },

  recentActivity(limit: number) {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: true },
    });
  },

  upcomingDeadlines(employeeId: string, limit: number) {
    return prisma.task.findMany({
      where: { assignedToId: employeeId, status: { not: TaskStatus.COMPLETED } },
      orderBy: { dueDate: "asc" },
      take: limit,
    });
  },
};
