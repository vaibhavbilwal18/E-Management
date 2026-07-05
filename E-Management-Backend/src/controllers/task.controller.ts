import type { Request, Response } from "express";
import { taskService, type TaskWithComputed } from "../services/task.service";
import { sendSuccess } from "../utils/apiResponse";
import { listTasksQuerySchema } from "../validators/task.validator";

function toPublicTask(task: TaskWithComputed) {
  const { assignedTo, ...rest } = task;
  const { user, ...employeeRest } = assignedTo;
  const {
    passwordHash: _passwordHash,
    resetPasswordToken: _resetPasswordToken,
    resetPasswordExpires: _resetPasswordExpires,
    ...publicUser
  } = user;
  return { ...rest, assignedTo: { ...employeeRest, user: publicUser } };
}

export const taskController = {
  async list(req: Request, res: Response) {
    const query = listTasksQuerySchema.parse(req.query);
    const result = await taskService.list(query, req.user!);
    sendSuccess(res, { ...result, items: result.items.map(toPublicTask) });
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const task = await taskService.getById(req.params.id, req.user!);
    sendSuccess(res, toPublicTask(task));
  },

  async create(req: Request, res: Response) {
    const task = await taskService.create(req.body, req.user!.id);
    sendSuccess(res, toPublicTask(task), "Task created", 201);
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const task = await taskService.update(req.params.id, req.body, req.user!);
    sendSuccess(res, toPublicTask(task), "Task updated");
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await taskService.remove(req.params.id, req.user!.id);
    sendSuccess(res, null, "Task deleted");
  },
};
