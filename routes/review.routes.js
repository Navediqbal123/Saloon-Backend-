import express from "express";
import {
  getMyReviews,
  addReview,
  getBarberReviews
} from "../controllers/review.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// =======================
// BARBER → My reviews
// =======================
router.get("/my-reviews", authMiddleware, getMyReviews);

// =======================
// CUSTOMER → Add review
// =======================
router.post("/add", authMiddleware, addReview);

// =======================
// PUBLIC → Get barber reviews
// =======================
router.get("/barber/:barber_id", getBarberReviews);

export default router;
