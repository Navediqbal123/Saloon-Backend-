import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Like a shop
export const likeShop = async (req, res) => {
  try {
    const customer_id = req.user?.id;
    const { shop_id } = req.body;

    if (!customer_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      typeof shop_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shop_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid shop_id is required",
      });
    }

    const { data, error } = await supabase
      .from("liked_shops")
      .insert({ customer_id, shop_id })
      .select()
      .single();

    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Shop already liked",
      });
    }

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Shop liked successfully",
      data,
    });
  } catch (error) {
    console.error("Like shop error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to like shop",
    });
  }
};

// Unlike a shop
export const unlikeShop = async (req, res) => {
  try {
    const customer_id = req.user?.id;
    const { shop_id } = req.body;

    if (!customer_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (
      typeof shop_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shop_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid shop_id is required",
      });
    }

    const { error } = await supabase
      .from("liked_shops")
      .delete()
      .eq("customer_id", customer_id)
      .eq("shop_id", shop_id);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Shop unliked successfully",
    });
  } catch (error) {
    console.error("Unlike shop error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to unlike shop",
    });
  }
};

// Get logged-in customer's liked shops
export const getLikedShops = async (req, res) => {
  try {
    const customer_id = req.user?.id;

    if (!customer_id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { data, error } = await supabase
      .from("liked_shops")
      .select("*")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      data: data ?? [],
    });
  } catch (error) {
    console.error("Get liked shops error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch liked shops",
    });
  }
};
