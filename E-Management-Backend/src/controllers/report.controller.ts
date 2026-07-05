import type { Request, Response } from "express";
import { reportService } from "../services/report.service";
import { sendSuccess } from "../utils/apiResponse";
import { exportReportQuerySchema } from "../validators/report.validator";

export const reportController = {
  async completedTasks(_req: Request, res: Response) {
    const data = await reportService.completedTasks();
    sendSuccess(res, data);
  },

  async pendingTasks(_req: Request, res: Response) {
    const data = await reportService.pendingTasks();
    sendSuccess(res, data);
  },

  async employeeWise(_req: Request, res: Response) {
    const data = await reportService.employeeWise();
    sendSuccess(res, data);
  },

  async export(req: Request, res: Response) {
    const { type, format } = exportReportQuerySchema.parse(req.query);
    const { buffer, contentType, filename } = await reportService.export(type, format);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  },
};
