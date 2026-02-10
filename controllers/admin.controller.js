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

export async function approveBarber(req, res) {
  const { userId, requestId } = req.body; 
  try {
    // 1. Request table status update
    await supabase.from("barber_requests").update({ status: "approved" }).eq("id", requestId);

    // 2. Profile role update (Permanent fix for refresh issue)
    const { error } = await supabase.from("profiles").update({ role: "barber" }).eq("id", userId);

    if (error) return res.status(400).json(error);
    res.json({ message: "Barber Approved & Role Updated Successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
