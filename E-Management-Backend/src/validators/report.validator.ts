import { z } from "zod";

export const exportReportQuerySchema = z.object({
  type: z.enum(["completed", "pending", "employee-wise"]),
  format: z.enum(["excel", "csv"]),
});

export type ExportReportQuery = z.infer<typeof exportReportQuerySchema>;
