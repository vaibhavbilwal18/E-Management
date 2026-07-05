import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { taskRepository, type TaskListFilters, type TaskWithRelations } from "../repositories/task.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { auditLogRepository } from "../repositories/auditLog.repository";
import { AppError } from "../utils/AppError";
import { buildPaginatedResult } from "../utils/pagination";
import { publishTaskAssigned, publishTaskCompleted, publishTaskUpdated } from "../kafka/producer/taskEvents";
import { dashboardService } from "./dashboard.service";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "../validators/task.validator";

interface Actor {
  id: string;
  role: Role;
}

export type TaskWithComputed = TaskWithRelations & { isOverdue: boolean };

const EMPLOYEE_ALLOWED_FIELDS = ["status"] as const;

function withComputedFields(task: TaskWithRelations): TaskWithComputed {
  const isOverdue = task.status !== TaskStatus.COMPLETED && task.dueDate < new Date();
  return { ...task, isOverdue };
}

async function resolveActorEmployeeId(actor: Actor): Promise<string | null> {
  if (actor.role !== Role.EMPLOYEE) return null;
  const employee = await employeeRepository.findByUserId(actor.id);
  if (!employee) {
    throw AppError.forbidden("No employee profile linked to this account");
  }
  return employee.id;
}

export const taskService = {
  async list(query: ListTasksQuery, actor: Actor) {
    const employeeId = await resolveActorEmployeeId(actor);
    const skip = (query.page - 1) * query.limit;

    const filters: TaskListFilters = {
      search: query.search,
      status: query.status,
      priority: query.priority,
      // Employees are always scoped to their own tasks, regardless of query params.
      assignedToId: employeeId ?? query.assignedToId,
      overdue: query.overdue,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      skip,
      take: query.limit,
    };

    const { items, total } = await taskRepository.findMany(filters);
    return buildPaginatedResult(items.map(withComputedFields), total, {
      page: query.page,
      limit: query.limit,
    });
  },

  async getById(id: string, actor: Actor): Promise<TaskWithComputed> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound("Task not found");
    }

    const employeeId = await resolveActorEmployeeId(actor);
    if (employeeId && task.assignedToId !== employeeId) {
      throw AppError.forbidden("You cannot view this task");
    }

    return withComputedFields(task);
  },

  async create(input: CreateTaskInput, actorId: string): Promise<TaskWithComputed> {
    const employee = await employeeRepository.findById(input.assignedToId);
    if (!employee) {
      throw AppError.badRequest("Assigned employee not found");
    }

    const task = await prisma.$transaction(async (tx) => {
      const created = await taskRepository.create(
        {
          title: input.title,
          description: input.description,
          priority: input.priority,
          status: input.status,
          startDate: input.startDate,
          dueDate: input.dueDate,
          assignedTo: { connect: { id: input.assignedToId } },
          createdById: actorId,
        },
        tx,
      );

      await auditLogRepository.create(
        { userId: actorId, action: "CREATE", entity: "Task", entityId: created.id },
        tx,
      );

      return created;
    });

    void publishTaskAssigned({
      taskId: task.id,
      userId: task.assignedTo.user.id,
      title: task.title,
      dueDate: task.dueDate.toISOString(),
      message: `You have been assigned a task: "${task.title}" (due ${task.dueDate.toLocaleDateString()})`,
    });
    void dashboardService.invalidate(task.assignedToId);

    return withComputedFields(task);
  },

  async update(id: string, input: UpdateTaskInput, actor: Actor): Promise<TaskWithComputed> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound("Task not found");
    }

    const employeeId = await resolveActorEmployeeId(actor);
    if (employeeId) {
      if (task.assignedToId !== employeeId) {
        throw AppError.forbidden("You cannot edit this task");
      }
      const disallowedField = Object.keys(input).find(
        (key) => !EMPLOYEE_ALLOWED_FIELDS.includes(key as (typeof EMPLOYEE_ALLOWED_FIELDS)[number]),
      );
      if (disallowedField) {
        throw AppError.forbidden(`Employees can only update: ${EMPLOYEE_ALLOWED_FIELDS.join(", ")}`);
      }
    }

    if (task.status === TaskStatus.COMPLETED) {
      throw AppError.unprocessable("Completed tasks cannot be edited");
    }

    const nextStartDate = input.startDate ?? task.startDate;
    const nextDueDate = input.dueDate ?? task.dueDate;
    if (nextDueDate < nextStartDate) {
      throw AppError.badRequest("Due date cannot be before start date");
    }

    const { assignedToId, ...rest } = input;

    if (assignedToId && assignedToId !== task.assignedToId) {
      const employee = await employeeRepository.findById(assignedToId);
      if (!employee) {
        throw AppError.badRequest("Assigned employee not found");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await taskRepository.update(
        id,
        {
          ...rest,
          assignedTo: assignedToId ? { connect: { id: assignedToId } } : undefined,
          completedAt: input.status === TaskStatus.COMPLETED ? new Date() : undefined,
        },
        tx,
      );

      await auditLogRepository.create(
        { userId: actor.id, action: "UPDATE", entity: "Task", entityId: id },
        tx,
      );

      return result;
    });

    if (input.status === TaskStatus.COMPLETED) {
      void publishTaskCompleted({
        taskId: updated.id,
        userId: updated.createdById,
        title: updated.title,
        dueDate: updated.dueDate.toISOString(),
        message: `Task "${updated.title}" has been marked as completed`,
      });
    } else if (assignedToId && assignedToId !== task.assignedToId) {
      void publishTaskAssigned({
        taskId: updated.id,
        userId: updated.assignedTo.user.id,
        title: updated.title,
        dueDate: updated.dueDate.toISOString(),
        message: `You have been assigned a task: "${updated.title}" (due ${updated.dueDate.toLocaleDateString()})`,
      });
    } else {
      void publishTaskUpdated({
        taskId: updated.id,
        userId: updated.assignedTo.user.id,
        title: updated.title,
        dueDate: updated.dueDate.toISOString(),
        message: `Task "${updated.title}" has been updated`,
      });
    }
    void dashboardService.invalidate(updated.assignedToId);
    if (assignedToId && assignedToId !== task.assignedToId) {
      void dashboardService.invalidate(task.assignedToId);
    }

    return withComputedFields(updated);
  },

  async remove(id: string, actorId: string): Promise<void> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw AppError.notFound("Task not found");
    }

    await prisma.$transaction(async (tx) => {
      await taskRepository.delete(id, tx);
      await auditLogRepository.create(
        { userId: actorId, action: "DELETE", entity: "Task", entityId: id },
        tx,
      );
    });

    void dashboardService.invalidate(task.assignedToId);
  },
};
