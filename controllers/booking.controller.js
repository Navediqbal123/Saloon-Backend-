import supabase from "../config/supabase.js";

export async function createBooking(req, res) {
  try {
    // 🔒 Auth check (ADMIN + USER dono ke liye)
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
      customer_id: req.user.id,  // auth user id
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
