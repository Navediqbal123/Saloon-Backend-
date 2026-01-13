import express from "express";
import { signup, login, createProfile } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// AUTH
router.post("/signup", signup);
router.post("/login", login);

// PROFILE (protected)
router.post("/create-profile", authMiddleware, createProfile);

// TEST
router.get("/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

export default router;
