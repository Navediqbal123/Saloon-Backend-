import express from "express";
import {
  registerBarber,
  approveBarber,
  getPendingBarbers,
  getApprovedBarbers,
  getMyBarberProfile
} from "../controllers/barber.controller.js";

import {
  addService,
  getServicesByBarber,
  getMyServices,
  updateService
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
 * =========================
 */
router.get("/pending", authMiddleware, getPendingBarbers);

/**
 * =========================
 * USERS → Approved barbers list
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
 * BARBER → My profile
 * =========================
 */
router.get("/me", authMiddleware, getMyBarberProfile);

/**
 * =========================
 * BARBER → Add service
 * =========================
 */
router.post("/add-service", authMiddleware, addService);

/**
 * =========================
 * BARBER → Update service
 * =========================
 */
router.patch("/service/:id", authMiddleware, updateService);

/**
 * =========================
 * USERS → Services of a barber
 * =========================
 */
router.get("/services/:barber_id", authMiddleware, getServicesByBarber);

/**
 * =========================
 * BARBER → My services
 * =========================
 */
router.get("/my-services", authMiddleware, getMyServices);

export default router;
