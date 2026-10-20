import supabase from "../config/supabase.js";

export async function getAllUsers(req, res) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, created_at");

    if (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    return res.json(data);
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
