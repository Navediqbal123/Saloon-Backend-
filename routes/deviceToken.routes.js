import express from "express";
import {
  registerDeviceToken,
  revokeDeviceToken,
} from "../controllers/deviceToken.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authMiddleware, registerDeviceToken);
router.post("/revoke", authMiddleware, revokeDeviceToken);

export default router;
