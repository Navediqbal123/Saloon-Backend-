import supabase from "../config/supabase.js";

// 1. Register Barber
export async function registerBarber(req, res) {
  try {
    const { shop_name, location } = req.body;
    const { data, error } = await supabase.from("barbers").insert({
      user_id: req.user.id,
      shop_name,
      location,
      status: "pending"
    }).select().single();
    if (error) return res.status(400).json(error);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 2. Approve Barber (Main Fix for Refresh issue)
export async function approveBarber(req, res) {
  try {
    const { id } = req.params; 
    const { user_id } = req.body; 
    await supabase.from("barbers").update({ status: "approved" }).eq("id", id);
    const { error } = await supabase.from("profiles").update({ role: "barber" }).eq("id", user_id);
    if (error) return res.status(400).json(error);
    res.json({ success: true, message: "Approved & Role Updated!" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 3. Get Pending (Missing tha isliye error aaya)
export async function getPendingBarbers(req, res) {
  try {
    const { data, error } = await supabase.from("barbers").select("*").eq("status", "pending");
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 4. Get Approved (Missing tha isliye error aaya)
export async function getApprovedBarbers(req, res) {
  try {
    const { data, error } = await supabase.from("barbers").select("*").eq("status", "approved");
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}
