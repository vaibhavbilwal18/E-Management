import type { Request, Response } from "express";
import { fileService } from "../services/file.service";
import { resolveUploadPath } from "../middlewares/upload.middleware";
import { sendSuccess } from "../utils/apiResponse";
import { AppError } from "../utils/AppError";
import type { FileWithRelations } from "../repositories/file.repository";

function toPublicFile(file: FileWithRelations) {
  const {
    passwordHash: _passwordHash,
    resetPasswordToken: _resetPasswordToken,
    resetPasswordExpires: _resetPasswordExpires,
    ...uploadedBy
  } = file.uploadedBy;
  const { path: _path, ...rest } = file;
  return { ...rest, uploadedBy };
}

export const fileController = {
  async upload(req: Request<{ taskId: string }>, res: Response) {
    if (!req.file) {
      throw AppError.badRequest("No file uploaded");
    }

    const file = await fileService.upload(req.params.taskId, req.user!, req.file);
    sendSuccess(res, toPublicFile(file), "File uploaded", 201);
  },

  async listByTask(req: Request<{ taskId: string }>, res: Response) {
    const files = await fileService.listByTask(req.params.taskId, req.user!);
    sendSuccess(res, files.map(toPublicFile));
  },

  async download(req: Request<{ id: string }>, res: Response) {
    const file = await fileService.getForDownload(req.params.id, req.user!);
    res.download(resolveUploadPath(file.storedName), file.originalName);
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await fileService.remove(req.params.id, req.user!);
    sendSuccess(res, null, "File deleted");
  },
};
