import express from "express";
import {
  registerDeviceToken,
  revokeDeviceToken,
  sendTestNotification,
} from "../controllers/deviceToken.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authMiddleware, registerDeviceToken);
router.post("/revoke", authMiddleware, revokeDeviceToken);

const runtimeEnvironment = (
  process.env.DEPLOYMENT_ENV ||
  process.env.NODE_ENV ||
  ""
).toLowerCase();
// Production requires an explicit deployment-config opt-in.
const testSendEnabled =
  runtimeEnvironment === "staging" ||
  runtimeEnvironment === "test" ||
  (runtimeEnvironment === "production" &&
    process.env.ENABLE_FCM_TEST_ENDPOINT === "true");

if (testSendEnabled) {
  router.post("/test-send", authMiddleware, sendTestNotification);
}

export default router;
