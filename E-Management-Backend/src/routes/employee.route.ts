import { Router } from "express";
import { Role } from "@prisma/client";
import { employeeController } from "../controllers/employee.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createEmployeeSchema, updateEmployeeSchema } from "../validators/employee.validator";

const router = Router();

router.use(authenticate, authorize(Role.ADMIN));

router.get("/", employeeController.list);
router.get("/:id", employeeController.getById);
router.post("/", validate(createEmployeeSchema), employeeController.create);
router.put("/:id", validate(updateEmployeeSchema), employeeController.update);
router.delete("/:id", employeeController.remove);

export default router;
