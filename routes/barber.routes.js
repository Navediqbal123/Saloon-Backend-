import express from "express";
import { registerBarber, approveBarber } from "../controllers/barber.controller.js";
import { addService } from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authMiddleware, registerBarber);
router.post("/add-service", authMiddleware, addService);
router.post("/approve/:id", approveBarber); // admin use

export default router;
