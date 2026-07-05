import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { sendSuccess } from "../utils/apiResponse";
import { listNotificationsQuerySchema } from "../validators/notification.validator";

export const notificationController = {
  async list(req: Request, res: Response) {
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await notificationService.list(req.user!.id, query);
    sendSuccess(res, result);
  },

  async markAsRead(req: Request<{ id: string }>, res: Response) {
    await notificationService.markAsRead(req.params.id, req.user!.id);
    sendSuccess(res, null, "Notification marked as read");
  },

  async markAllAsRead(req: Request, res: Response) {
    await notificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, null, "All notifications marked as read");
  },
};
