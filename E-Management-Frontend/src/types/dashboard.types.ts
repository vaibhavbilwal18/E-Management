import type { TaskPriority, TaskStatus } from "./task.types";

export interface AdminDashboard {
  totals: {
    employees: number;
    tasks: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
    user: { id: string; fullName: string } | null;
  }[];
}

export interface EmployeeDashboard {
  tasksByStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  upcomingDeadlines: {
    id: string;
    title: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string;
  }[];
}
