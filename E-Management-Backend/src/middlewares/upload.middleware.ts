import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer, { type FileFilterCallback } from "multer";
import type { Request } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_ROOT);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname)}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(AppError.badRequest("Only PDF, JPG, and PNG files are allowed"));
    return;
  }
  cb(null, true);
}

export const uploadTaskAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
}).single("file");

export function resolveUploadPath(storedName: string): string {
  return path.join(UPLOAD_ROOT, storedName);
}
