import { Router } from "express";
import healthRoute from "./health.route";
import authRoute from "./auth.route";
import employeeRoute from "./employee.route";
import taskRoute from "./task.route";
import notificationRoute from "./notification.route";
import attachmentRoute from "./attachment.route";
import dashboardRoute from "./dashboard.route";
import reportRoute from "./report.route";

const router = Router();

router.use("/health", healthRoute);
router.use("/auth", authRoute);
router.use("/employees", employeeRoute);
router.use("/tasks", taskRoute);
router.use("/notifications", notificationRoute);
router.use("/attachments", attachmentRoute);
router.use("/dashboard", dashboardRoute);
router.use("/reports", reportRoute);

export default router;
