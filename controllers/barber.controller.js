import supabase from "../config/supabase.js";

export async function registerBarber(req, res) {
  const { shop_name, location } = req.body;

  const { error } = await supabase.from("barbers").insert({
    user_id: req.user.id,
    shop_name,
    location
  });

  if (error) return res.status(400).json(error);
  res.json({ success: true });
}

export async function approveBarber(req, res) {
  const { id } = req.params;

  await supabase
    .from("barbers")
    .update({ status: "approved" })
    .eq("id", id);

  res.json({ approved: true });
}
