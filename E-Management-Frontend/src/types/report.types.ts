export interface TaskReportRow {
  title: string;
  priority: string;
  status: string;
  assignedTo: string;
  department: string;
  startDate: string;
  dueDate: string;
  completedAt: string | null;
  isOverdue: boolean;
}

export interface EmployeeReportRow {
  fullName: string;
  email: string;
  department: string;
  designation: string;
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export type ReportType = "completed" | "pending" | "employee-wise";
export type ReportFormat = "excel" | "csv";
