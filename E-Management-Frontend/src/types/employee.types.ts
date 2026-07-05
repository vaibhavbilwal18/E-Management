import type { UserRole } from "./auth.types";

export interface EmployeeUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface Employee {
  id: string;
  userId: string;
  department: string;
  designation: string;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: EmployeeUserSummary;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type EmployeeSortBy = "fullName" | "email" | "department" | "designation" | "createdAt";

export interface ListEmployeesParams {
  search?: string;
  department?: string;
  sortBy?: EmployeeSortBy;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateEmployeeRequest {
  fullName: string;
  email: string;
  department: string;
  designation: string;
}

export interface CreateEmployeeResponse {
  employee: Employee;
  tempPassword: string;
}

export interface UpdateEmployeeRequest {
  fullName?: string;
  email?: string;
  department?: string;
  designation?: string;
}
