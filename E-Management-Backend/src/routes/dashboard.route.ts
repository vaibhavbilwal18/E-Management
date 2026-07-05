import { Router } from "express";
import { Role } from "@prisma/client";
import { dashboardController } from "../controllers/dashboard.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";

const router = Router();

router.use(authenticate);

router.get("/admin", authorize(Role.ADMIN), dashboardController.admin);
router.get("/employee", authorize(Role.EMPLOYEE), dashboardController.employee);

export default router;
