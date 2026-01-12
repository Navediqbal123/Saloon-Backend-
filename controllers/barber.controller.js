import supabase from "../../config/supabase.js";

export async function registerBarber(req, res) {
  const { shop_name, location } = req.body;

  const { data, error } = await supabase
    .from("barbers")
    .insert({
      user_id: req.user.id,
      shop_name,
      location,
      status: "pending"   // ✅ default status
    })
    .select()
    .single();

  if (error) return res.status(400).json(error);

  res.json({
    success: true,
    barber_id: data.id   // ✅ IMPORTANT: services ke liye ye id use hogi
  });
}

export async function approveBarber(req, res) {
  const { id } = req.params;

  const { error } = await supabase
    .from("barbers")
    .update({ status: "approved" })
    .eq("id", id);

  if (error) return res.status(400).json(error);

  res.json({ approved: true });
}
