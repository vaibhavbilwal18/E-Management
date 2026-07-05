import { z } from "zod";
import { TaskPriority } from "@prisma/client";

// OVERDUE is a system-computed state (Phase 3: derived at read time; Phase 4: a cron
// job additionally persists it) — never directly settable by a client.
const userSettableStatus = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(2, "Title is too short").max(200),
    description: z.string().trim().min(1, "Description is required"),
    priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
    status: userSettableStatus.optional().default("PENDING"),
    startDate: z.coerce.date(),
    dueDate: z.coerce.date(),
    assignedToId: z.string().uuid("Invalid employee id"),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "Due date cannot be before start date",
    path: ["dueDate"],
  });

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(2, "Title is too short").max(200).optional(),
    description: z.string().trim().min(1, "Description is required").optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    status: userSettableStatus.optional(),
    startDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
    assignedToId: z.string().uuid("Invalid employee id").optional(),
  })
  .refine((data) => !(data.startDate && data.dueDate) || data.dueDate >= data.startDate, {
    message: "Due date cannot be before start date",
    path: ["dueDate"],
  });

export const listTasksQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedToId: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
  sortBy: z
    .enum(["title", "priority", "status", "startDate", "dueDate", "createdAt"])
    .optional()
    .default("dueDate"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
