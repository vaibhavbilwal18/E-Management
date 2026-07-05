import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
