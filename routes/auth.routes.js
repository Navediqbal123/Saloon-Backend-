import express from "express";
import { createProfile } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// ✅ PROFILE (protected)
router.post("/create-profile", authMiddleware, createProfile);

// ✅ TEMP TEST ROUTE (token check)
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
