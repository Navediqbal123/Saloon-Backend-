import express from "express";
import { registerBarber, approveBarber } from "../controllers/barber.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authMiddleware, registerBarber);
router.post("/approve/:id", approveBarber); // admin use

export default router;
