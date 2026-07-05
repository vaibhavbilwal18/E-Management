import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";
import { sendSuccess } from "../utils/apiResponse";

export const dashboardController = {
  async admin(_req: Request, res: Response) {
    const data = await dashboardService.admin();
    sendSuccess(res, data);
  },

  async employee(req: Request, res: Response) {
    const data = await dashboardService.employee(req.user!.id);
    sendSuccess(res, data);
  },
};
