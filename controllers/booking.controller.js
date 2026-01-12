import supabase from "../config/supabase.js";

export async function createBooking(req, res) {
  try {
    const {
      barber_id,
      service_id,
      date,
      time_slot,
      home_service
    } = req.body;

    const booking = {
      barber_id,                 // barbers.id
      service_id,                // services.id
      customer_id: req.user.id,  // auth user
      date,
      time_slot,
      home_service,
      status: "pending"          // default
    };

    const { error } = await supabase
      .from("bookings")
      .insert(booking);

    if (error) {
      return res.status(400).json(error);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
