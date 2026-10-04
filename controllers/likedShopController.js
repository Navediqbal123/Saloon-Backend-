import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Like a shop
export const likeShop = async (req, res) => {
  try {
    const { customer_id, shop_id } = req.body;

    if (!customer_id || !shop_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id and shop_id are required",
      });
    }

    const { data, error } = await supabase
      .from("liked_shops")
      .insert({
        customer_id,
        shop_id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Shop already liked",
        });
      }

      throw error;
    }

    res.status(201).json({
      success: true,
      message: "Shop liked successfully",
      data,
    });
  } catch (error) {
    console.error("Like shop error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to like shop",
    });
  }
};

// Unlike a shop
export const unlikeShop = async (req, res) => {
  try {
    const { customer_id, shop_id } = req.body;

    if (!customer_id || !shop_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id and shop_id are required",
      });
    }

    const { error } = await supabase
      .from("liked_shops")
      .delete()
      .eq("customer_id", customer_id)
      .eq("shop_id", shop_id);

    if (error) throw error;

    res.json({
      success: true,
      message: "Shop unliked successfully",
    });
  } catch (error) {
    console.error("Unlike shop error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to unlike shop",
    });
  }
};

// Get customer's liked shops
export const getLikedShops = async (req, res) => {
  try {
    const { customer_id } = req.params;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        message: "customer_id is required",
      });
    }

    const { data, error } = await supabase
      .from("liked_shops")
      .select("*")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get liked shops error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch liked shops",
    });
  }
};
