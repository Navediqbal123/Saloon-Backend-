import express from "express";
// Dhyan de: getAllUsers admin controller se aayega
import { getAllUsers } from "../controllers/admin.controller.js"; 
// Aur approveBarber ab barber controller se aayega
import { approveBarber } from "../controllers/barber.controller.js"; 
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Route 1: Users list
router.get("/users", authMiddleware, getAllUsers);

// Route 2: Approve Barber
router.post("/approve-barber", authMiddleware, approveBarber);

export default router;
