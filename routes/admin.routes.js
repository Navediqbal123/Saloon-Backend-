import express from "express";
import { getAllUsers, approveBarber } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Users ki list dekhne ke liye
router.get("/users", authMiddleware, getAllUsers);

// Barber approve karne aur role change karne ke liye
router.post("/approve-barber", authMiddleware, approveBarber);

export default router;
