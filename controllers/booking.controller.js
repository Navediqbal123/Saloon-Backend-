import supabase from "../config/supabase.js";

// =======================
// CREATE BOOKING (USER / ADMIN)
// =======================
export async function createBooking(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      barber_id,
      service_id,
      date,
      time_slot,
      home_service
    } = req.body;

    // 🧪 Basic validation
    if (!barber_id || !service_id || !date || !time_slot) {
      return res.status(400).json({
        error: "barber_id, service_id, date and time_slot are required"
      });
    }

    const booking = {
      barber_id,                 // barbers.id (UUID)
      service_id,                // services.id (UUID)
      customer_id: req.user.id,  // logged-in user
      date,
      time_slot,
      home_service: home_service || false,
      status: "pending"
    };

    const { error } = await supabase
      .from("bookings")
      .insert(booking);

    if (error) {
      return res.status(400).json(error);
    }

    return res.json({
      success: true,
      message: "Booking created successfully"
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// GET MY BOOKINGS (USER)
// =======================
export async function getMyBookings(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// BARBER – My received bookings
// =======================
export async function getBarberBookings(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // barber ka record nikaalo
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("status", "approved")
      .single();

    if (barberError || !barber) {
      return res.status(403).json({ error: "Not an approved barber" });
    }

    // us barber ki saari bookings
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("barber_id", barber.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}

// =======================
// ADMIN – All bookings
// =======================
export async function getAllBookings(req, res) {
  try {
    // 🔒 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json(error);
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
