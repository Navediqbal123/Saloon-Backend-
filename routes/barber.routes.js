import express from "express";
import {
  registerBarber,
  approveBarber,
  getPendingBarbers,
  getApprovedBarbers
} from "../controllers/barber.controller.js";

import {
  addService,
  getServicesByBarber,
  getMyServices
} from "../controllers/service.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * =========================
 * USER → Become Barber
 * =========================
 */
router.post("/register", authMiddleware, registerBarber);

/**
 * =========================
 * ADMIN → Pending barber requests
 * (Admin panel me show honge)
 * =========================
 */
router.get("/pending", authMiddleware, getPendingBarbers);

/**
 * =========================
 * USERS → Approved barbers list
 * (Booking page ke liye)
 * =========================
 */
router.get("/approved", authMiddleware, getApprovedBarbers);

/**
 * =========================
 * ADMIN → Approve barber
 * =========================
 */
router.post("/approve/:id", authMiddleware, approveBarber);

/**
 * =========================
 * BARBER → Add service
 * =========================
 */
router.post("/add-service", authMiddleware, addService);

/**
 * =========================
 * USERS → Services of a barber
 * (Booking page)
 * =========================
 */
router.get("/services/:barber_id", authMiddleware, getServicesByBarber);

/**
 * =========================
 * BARBER → My services
 * (Barber dashboard)
 * =========================
 */
router.get("/my-services", authMiddleware, getMyServices);

export default router;
