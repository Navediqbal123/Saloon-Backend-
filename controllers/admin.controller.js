import supabase from "../config/supabase.js";

export async function getAllUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, created_at");

    if (error) return res.status(400).json(error);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}
