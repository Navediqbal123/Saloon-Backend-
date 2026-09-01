import supabase from "../config/supabase.js";

// =======================
// 1. ADD SERVICE (APPROVED BARBER)
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

    // ✅ STEP 1: Barber record nikaalo
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id, shop_name")
      .eq("user_id", req.user.id)
      .single();

    if (barberError || !barber) {
      return res.status(403).json({
        error: "Barber profile not found"
      });
    }

    // ✅ STEP 2: Barber ka personal name nikaalo
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", req.user.id)
      .single();

    const barberName = profile?.full_name || "Barber";

    // ✅ STEP 3: Service insert
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

    // 🔔 Sabhi customers ko notification bhejo
    const { data: customers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "customer");

    if (customers && customers.length > 0) {
      const notifications = customers.map(customer => ({
        user_id: customer.id,
        message: `🆕 New service by ${barberName} (${barber.shop_name}): '${name}' — ₹${price}. Book now!`
      }));

      await supabase.from("notifications").insert(notifications);
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
// 2. GET SERVICES BY BARBER (BOOKING PAGE)
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
// 3. GET MY SERVICES (LOGGED-IN BARBER)
// =======================
export async function getMyServices(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ STEP 1: Barber record nikaalo
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .single();

    if (barberError || !barber) {
      return res.status(403).json({
        error: "Barber profile not found"
      });
    }

    // ✅ STEP 2: Barber ki services lao
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

// =======================
// 4. UPDATE SERVICE (BARBER / ADMIN)
// =======================
export async function updateService(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id);

    if (error) {
      return res.status(400).json(error);
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// 5. GET ALL SERVICES (SABHI USERS KE LIYE)
// =======================
export async function getServices(req, res) {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*, barbers(id, shop_name, user_id)")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json(error);

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
