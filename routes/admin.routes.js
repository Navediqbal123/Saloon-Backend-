import express from "express";
import { getAllUsers, approveBarber } from "../controllers/barber.controller.js"; // Check karna ye file sahi ho
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/users", authMiddleware, getAllUsers);
router.post("/approve", authMiddleware, approveBarber); // URL ab short hai: /api/admin/approve

export default router;
