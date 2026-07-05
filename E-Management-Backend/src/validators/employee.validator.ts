import { z } from "zod";

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  department: z.string().trim().min(1, "Department is required"),
  designation: z.string().trim().min(1, "Designation is required"),
});

export const updateEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(100).optional(),
  email: z.string().trim().toLowerCase().email("Invalid email address").optional(),
  department: z.string().trim().min(1, "Department is required").optional(),
  designation: z.string().trim().min(1, "Designation is required").optional(),
});

export const listEmployeesQuerySchema = z.object({
  search: z.string().trim().optional(),
  department: z.string().trim().optional(),
  sortBy: z
    .enum(["fullName", "email", "department", "designation", "createdAt"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
