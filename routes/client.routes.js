import express from "express";
import { getMyClients } from "../controllers/client.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/my-clients", authMiddleware, getMyClients);

export default router;
