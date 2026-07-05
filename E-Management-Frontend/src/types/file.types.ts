import type { EmployeeUserSummary } from "./employee.types";

export interface TaskFile {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  taskId: string | null;
  uploadedById: string;
  createdAt: string;
  uploadedBy: EmployeeUserSummary;
}
