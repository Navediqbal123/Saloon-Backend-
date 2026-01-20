import supabase from "../config/supabase.js";

// =======================
// REGISTER BARBER (USER)
// =======================
export async function registerBarber(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { shop_name, location } = req.body;

    // 🧪 Basic validation
    if (!shop_name || !location) {
      return res.status(400).json({ error: "shop_name and location required" });
    }

    // ✅ Insert barber request
    const { data, error } = await supabase
      .from("barbers")
      .insert({
        user_id: req.user.id,
        shop_name,
        location,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json(error);
    }

    return res.json({
      success: true,
      message: "Barber request submitted, waiting for approval",
      barber_id: data.id
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// APPROVE BARBER (ADMIN)
// =======================
export async function approveBarber(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Barber ID required" });
    }

    const { error } = await supabase
      .from("barbers")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      return res.status(400).json(error);
    }

    return res.json({
      approved: true,
      message: "Barber approved successfully"
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// ADMIN – Pending barber requests
// =======================
export async function getPendingBarbers(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("status", "pending");

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// USERS – Approved barbers (booking ke liye)
// =======================
export async function getApprovedBarbers(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("status", "approved");

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
