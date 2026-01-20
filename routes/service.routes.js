import express from "express";
import { getServicesByBarber } from "../controllers/service.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:barber_id", authMiddleware, getServicesByBarber);

export default router;
