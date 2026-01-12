import supabase from "../config/supabase.js";

export async function addService(req, res) {
  const { name, price, duration, home_service } = req.body;

  const { error } = await supabase.from("services").insert({
    barber_id: req.user.id,
    name,
    price,
    duration,
    home_service
  });

  if (error) return res.status(400).json(error);
  res.json({ success: true });
}
