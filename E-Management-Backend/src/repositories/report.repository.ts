import { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

const withAssignee = { assignedTo: { include: { user: true } } } satisfies Prisma.TaskInclude;

export type ReportTask = Prisma.TaskGetPayload<{ include: typeof withAssignee }>;

const withTasks = { user: true, assignedTasks: true } satisfies Prisma.EmployeeInclude;

export type EmployeeWithTasks = Prisma.EmployeeGetPayload<{ include: typeof withTasks }>;

export const reportRepository = {
  completedTasks(): Promise<ReportTask[]> {
    return prisma.task.findMany({
      where: { status: TaskStatus.COMPLETED },
      include: withAssignee,
      orderBy: { completedAt: "desc" },
    });
  },

  pendingTasks(): Promise<ReportTask[]> {
    return prisma.task.findMany({
      where: { status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] } },
      include: withAssignee,
      orderBy: { dueDate: "asc" },
    });
  },

  employeesWithTasks(): Promise<EmployeeWithTasks[]> {
    return prisma.employee.findMany({
      where: { isDeleted: false },
      include: withTasks,
      orderBy: { user: { fullName: "asc" } },
    });
  },
};
