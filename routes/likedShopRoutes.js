
import express from "express";
import {
  likeShop,
  unlikeShop,
  getLikedShops,
} from "../controllers/likedShopController.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/like", authMiddleware, likeShop);
router.delete("/unlike", authMiddleware, unlikeShop);
router.get("/", authMiddleware, getLikedShops);

export default router;
