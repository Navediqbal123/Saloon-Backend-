import express from "express";
import { getAllUsers } from "../controllers/admin.controller.js";
import { approveBarber } from "../controllers/barber.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { adminMiddleware } from "../middleware/admin.middleware.js";

const router = express.Router();

router.get("/users", authMiddleware, adminMiddleware, getAllUsers);
router.post("/approve-barber", authMiddleware, adminMiddleware, approveBarber);
router.post("/approve/:id", authMiddleware, adminMiddleware, approveBarber);

export default router;
