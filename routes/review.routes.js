import express from "express";
import { getMyReviews } from "../controllers/review.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/my-reviews", authMiddleware, getMyReviews);

export default router;
