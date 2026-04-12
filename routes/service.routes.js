import express from "express";
import { getServices, addService } from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Purane ki zarurat nahi, ye sab handle kar lega
router.get("/", authMiddleware, getServices);
router.post("/", authMiddleware, addService);

export default router;
