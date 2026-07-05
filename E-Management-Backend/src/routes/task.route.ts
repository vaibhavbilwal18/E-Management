import { Router } from "express";
import { Role } from "@prisma/client";
import { taskController } from "../controllers/task.controller";
import { fileController } from "../controllers/file.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { uploadTaskAttachment } from "../middlewares/upload.middleware";
import { createTaskSchema, updateTaskSchema } from "../validators/task.validator";

const router = Router();

router.use(authenticate);

router.get("/", taskController.list);
router.get("/:id", taskController.getById);
router.post("/", authorize(Role.ADMIN), validate(createTaskSchema), taskController.create);
router.put("/:id", validate(updateTaskSchema), taskController.update);
router.delete("/:id", authorize(Role.ADMIN), taskController.remove);

router.get("/:taskId/attachments", fileController.listByTask);
router.post("/:taskId/attachments", uploadTaskAttachment, fileController.upload);

export default router;
