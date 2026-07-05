import { z } from "zod";

export const taskFormSchema = z
  .object({
    title: z.string().trim().min(2, "Title is too short").max(200),
    description: z.string().trim().min(1, "Description is required"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
    startDate: z.string().min(1, "Start date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    assignedToId: z.string().min(1, "Assigned employee is required"),
  })
  .refine((data) => new Date(data.dueDate) >= new Date(data.startDate), {
    message: "Due date cannot be before start date",
    path: ["dueDate"],
  });

export type TaskFormValues = z.infer<typeof taskFormSchema>;
