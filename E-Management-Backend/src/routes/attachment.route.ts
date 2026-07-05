import { Router } from "express";
import { fileController } from "../controllers/file.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/:id/download", fileController.download);
router.delete("/:id", fileController.remove);

export default router;
