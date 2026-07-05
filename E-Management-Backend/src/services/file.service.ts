import fs from "node:fs/promises";
import { Role } from "@prisma/client";
import { taskRepository } from "../repositories/task.repository";
import { employeeRepository } from "../repositories/employee.repository";
import { fileRepository, type FileWithRelations } from "../repositories/file.repository";
import { resolveUploadPath } from "../middlewares/upload.middleware";
import { AppError } from "../utils/AppError";

interface Actor {
  id: string;
  role: Role;
}

interface UploadedFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

async function assertCanAccessTask(taskId: string, actor: Actor) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw AppError.notFound("Task not found");
  }

  if (actor.role === Role.EMPLOYEE) {
    const employee = await employeeRepository.findByUserId(actor.id);
    if (!employee || task.assignedToId !== employee.id) {
      throw AppError.forbidden("You cannot access attachments for this task");
    }
  }

  return task;
}

async function deleteFromDisk(storedName: string) {
  await fs.unlink(resolveUploadPath(storedName)).catch(() => undefined);
}

export const fileService = {
  async upload(taskId: string, actor: Actor, uploaded: UploadedFile): Promise<FileWithRelations> {
    try {
      await assertCanAccessTask(taskId, actor);
    } catch (err) {
      await deleteFromDisk(uploaded.filename);
      throw err;
    }

    return fileRepository.create({
      originalName: uploaded.originalname,
      storedName: uploaded.filename,
      mimeType: uploaded.mimetype,
      sizeBytes: uploaded.size,
      path: uploaded.filename,
      taskId,
      uploadedById: actor.id,
    });
  },

  async listByTask(taskId: string, actor: Actor): Promise<FileWithRelations[]> {
    await assertCanAccessTask(taskId, actor);
    return fileRepository.findManyByTaskId(taskId);
  },

  async getForDownload(fileId: string, actor: Actor): Promise<FileWithRelations> {
    const file = await fileRepository.findById(fileId);
    if (!file) {
      throw AppError.notFound("File not found");
    }
    if (file.taskId) {
      await assertCanAccessTask(file.taskId, actor);
    }
    return file;
  },

  async remove(fileId: string, actor: Actor): Promise<void> {
    const file = await fileRepository.findById(fileId);
    if (!file) {
      throw AppError.notFound("File not found");
    }

    if (actor.role !== Role.ADMIN && file.uploadedById !== actor.id) {
      throw AppError.forbidden("You can only delete files you uploaded");
    }

    await fileRepository.delete(fileId);
    await deleteFromDisk(file.storedName);
  },
};
