import { z } from "zod";

export const employeeFormSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short"),
  email: z.string().trim().email("Invalid email address"),
  department: z.string().trim().min(1, "Department is required"),
  designation: z.string().trim().min(1, "Designation is required"),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
