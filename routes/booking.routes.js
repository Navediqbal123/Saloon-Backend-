import express from "express";
import { createBooking } from "../controllers/booking.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * ✅ USER → Create booking (login required)
 */
router.post("/create", authMiddleware, createBooking);

/**
 * ✅ USER / BARBER / ADMIN
 * (future-safe: token valid ho to error nahi aayega)
 */
router.get("/my", authMiddleware, (req, res) => {
  res.json({ message: "My bookings route connected" });
});

/**
 * ✅ ADMIN → View all bookings (later use)
 */
router.get("/all", authMiddleware, (req, res) => {
  res.json({ message: "Admin bookings route connected" });
});

export default router;
