import type { Employee } from "./employee.types";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
export type UserSettableTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  assignedToId: string;
  createdById: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
  assignedTo: Employee;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TaskSortBy = "title" | "priority" | "status" | "startDate" | "dueDate" | "createdAt";

export interface ListTasksParams {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedToId?: string;
  overdue?: boolean;
  sortBy?: TaskSortBy;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  status: UserSettableTaskStatus;
  startDate: string;
  dueDate: string;
  assignedToId: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: UserSettableTaskStatus;
  startDate?: string;
  dueDate?: string;
  assignedToId?: string;
}
