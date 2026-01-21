import express from "express";
import {
  createBooking,
  getMyBookings,
  getBarberBookings,
  getAllBookings,
  cancelBooking          // ✅ ADD HERE
} from "../controllers/booking.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// =========================
// USER → Create booking
// =========================
router.post("/create", authMiddleware, createBooking);

// =========================
// USER → My bookings
// =========================
router.get("/my", authMiddleware, getMyBookings);

// =========================
// BARBER → My received bookings
// =========================
router.get("/barber", authMiddleware, getBarberBookings);

// =========================
// ADMIN → All bookings
// =========================
router.get("/all", authMiddleware, getAllBookings);

// =========================
// USER / BARBER / ADMIN → Cancel booking
// =========================
router.patch("/cancel/:id", authMiddleware, cancelBooking);

export default router;
