import supabase from "../config/supabase.js";

export async function createProfile(req, res) {
  const { role, name, phone } = req.body;

  const { error } = await supabase.from("profiles").insert({
    id: req.user.id,
    role,
    name,
    phone
  });

  if (error) return res.status(400).json(error);

  res.json({ success: true });
}
