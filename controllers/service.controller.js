import supabase from "../../config/supabase.js";

export async function addService(req, res) {
  const { name, price, duration, home_service } = req.body;

  // 🔴 barber_id BODY se nahi, barbers table ke id se aayega
  const barber_id = req.user.barber_id; 

  if (!barber_id) {
    return res.status(400).json({ error: "Barber not registered" });
  }

  const { error } = await supabase.from("services").insert({
    barber_id,
    name,
    price,
    duration,
    home_service
  });

  if (error) return res.status(400).json(error);

  res.json({ success: true });
}
