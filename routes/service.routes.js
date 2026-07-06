import express from "express";
import { getServices, addService } from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// ✅ GET — no auth, sabhi dekh sakte hain
router.get("/", getServices);

// ✅ POST — auth required
router.post("/", authMiddleware, addService);

export default router;
