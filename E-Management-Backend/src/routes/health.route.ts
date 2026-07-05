import { Router } from "express";
import { sendSuccess } from "../utils/apiResponse";

const router = Router();

router.get("/", (_req, res) => {
  sendSuccess(res, { uptime: process.uptime(), timestamp: new Date().toISOString() }, "OK");
});

export default router;
