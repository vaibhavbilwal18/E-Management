import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";

type Client = Prisma.TransactionClient | typeof prisma;

const withRelations = { assignedTo: { include: { user: true } } } satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof withRelations }>;

export type TaskSortBy = "title" | "priority" | "status" | "startDate" | "dueDate" | "createdAt";

export interface TaskListFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
  overdue?: boolean;
  sortBy: TaskSortBy;
  sortOrder: "asc" | "desc";
  skip: number;
  take: number;
}

function buildWhere(
  filters: Pick<TaskListFilters, "search" | "status" | "priority" | "assignedToId" | "overdue">,
): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  if (filters.assignedToId) {
    where.assignedToId = filters.assignedToId;
  }
  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.overdue) {
    where.dueDate = { lt: new Date() };
    where.status = { not: TaskStatus.COMPLETED };
  } else if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(
  sortBy: TaskSortBy,
  sortOrder: "asc" | "desc",
): Prisma.TaskOrderByWithRelationInput {
  return { [sortBy]: sortOrder };
}

export const taskRepository = {
  create(data: Prisma.TaskCreateInput, client: Client = prisma) {
    return client.task.create({ data, include: withRelations });
  },

  findById(id: string) {
    return prisma.task.findUnique({ where: { id }, include: withRelations });
  },

  async findMany(filters: TaskListFilters): Promise<{ items: TaskWithRelations[]; total: number }> {
    const where = buildWhere(filters);
    const orderBy = buildOrderBy(filters.sortBy, filters.sortOrder);

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy,
        skip: filters.skip,
        take: filters.take,
        include: withRelations,
      }),
      prisma.task.count({ where }),
    ]);

    return { items, total };
  },

  update(id: string, data: Prisma.TaskUpdateInput, client: Client = prisma) {
    return client.task.update({ where: { id }, data, include: withRelations });
  },

  delete(id: string, client: Client = prisma) {
    return client.task.delete({ where: { id } });
  },
};
