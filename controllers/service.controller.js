import supabase from "../config/supabase.js";

// =======================
// ADD SERVICE (APPROVED BARBER)
// =======================
export async function addService(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, price, duration, home_service } = req.body;

    // 🧪 Basic validation
    if (!name || !price || !duration) {
      return res.status(400).json({
        error: "name, price and duration are required"
      });
    }

    // ✅ STEP 1: approved barber record nikaalo
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("status", "approved")
      .single();

    if (barberError || !barber) {
      return res.status(403).json({
        error: "Barber not approved or not registered"
      });
    }

    // ✅ STEP 2: service insert
    const { error } = await supabase
      .from("services")
      .insert({
        barber_id: barber.id,
        name,
        price,
        duration,
        home_service: home_service || false
      });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json({
      success: true,
      message: "Service added successfully"
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// GET SERVICES BY BARBER (BOOKING PAGE)
// =======================
export async function getServicesByBarber(req, res) {
  try {
    const { barber_id } = req.params;

    if (!barber_id) {
      return res.status(400).json({ error: "barber_id required" });
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("barber_id", barber_id);

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// GET MY SERVICES (LOGGED-IN APPROVED BARBER)
// =======================
export async function getMyServices(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ STEP 1: approved barber record nikaalo
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("status", "approved")
      .single();

    if (barberError || !barber) {
      return res.status(403).json({
        error: "Barber not approved or not registered"
      });
    }

    // ✅ STEP 2: barber ki services lao
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("barber_id", barber.id);

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
