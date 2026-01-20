import express from "express";
import {
  createBooking,
  getMyBookings,
  getBarberBookings,
  getAllBookings
} from "../controllers/booking.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// USER → Create booking
router.post("/create", authMiddleware, createBooking);

// USER → My bookings
router.get("/my", authMiddleware, getMyBookings);

// BARBER → My received bookings
router.get("/barber", authMiddleware, getBarberBookings);

// ADMIN → All bookings
router.get("/all", authMiddleware, getAllBookings);

export default router;
