import { Router } from "express";
import { Role } from "@prisma/client";
import { reportController } from "../controllers/report.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get("/completed-tasks", reportController.completedTasks);
router.get("/pending-tasks", reportController.pendingTasks);
router.get("/employee-wise", reportController.employeeWise);
router.get("/export", reportController.export);

export default router;
