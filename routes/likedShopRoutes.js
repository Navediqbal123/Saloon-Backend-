import express from "express";
import {
  likeShop,
  unlikeShop,
  getLikedShops,
} from "../controllers/likedShopController.js";

const router = express.Router();

router.post("/like", likeShop);
router.delete("/unlike", unlikeShop);
router.get("/:customer_id", getLikedShops);

export default router;
