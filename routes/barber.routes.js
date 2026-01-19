import express from "express";
import { registerBarber, approveBarber } from "../controllers/barber.controller.js";
import { addService } from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * ✅ USER → Become Barber (login required)
 */
router.post("/register", authMiddleware, registerBarber);

/**
 * ✅ BARBER → Add Service (only approved barber)
 */
router.post("/add-service", authMiddleware, addService);

/**
 * ✅ ADMIN → Approve Barber
 * (admin bhi logged-in hoga, isliye authMiddleware zaroori)
 */
router.post("/approve/:id", authMiddleware, approveBarber);

export default router;
