import supabase from "../config/supabase.js";

export async function addService(req, res) {
  const { barber_id, name, price, duration, home_service } = req.body;

  const { error } = await supabase.from("services").insert({
    barber_id,        // 👈 barbers table ka REAL id
    name,
    price,
    duration,
    home_service
  });

  if (error) return res.status(400).json(error);

  res.json({ success: true });
}
