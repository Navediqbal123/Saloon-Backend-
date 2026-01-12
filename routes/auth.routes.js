import express from "express";
import { createProfile } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-profile", authMiddleware, createProfile);

export default router;
