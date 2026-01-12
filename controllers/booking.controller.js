import supabase from "../config/supabase.js";

export async function createBooking(req, res) {
  const booking = {
    ...req.body,
    customer_id: req.user.id
  };

  const { error } = await supabase.from("bookings").insert(booking);

  if (error) return res.status(400).json(error);
  res.json({ success: true });
}
