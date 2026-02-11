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

// 2. Approve Barber (FIXED: Ab id body se lega)
export async function approveBarber(req, res) {
  try {
    // id aur user_id dono body se aayenge
    const { id, user_id } = req.body; 

    if (!id || !user_id) {
      return res.status(400).json({ error: "Missing id or user_id" });
    }

    // A. Barbers table update
    await supabase.from("barbers").update({ status: "approved" }).eq("id", id);
    
    // B. Profiles table update (Isse Sidebar change hoga)
    const { error: profileError } = await supabase.from("profiles").update({ role: "barber" }).eq("id", user_id);
    
    if (profileError) return res.status(400).json(profileError);
    
    res.json({ success: true, message: "Approved & Role Updated!" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 3. Get Pending 
export async function getPendingBarbers(req, res) {
  try {
    const { data, error } = await supabase.from("barbers").select("*").eq("status", "pending");
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 4. Get Approved 
export async function getApprovedBarbers(req, res) {
  try {
    const { data, error } = await supabase.from("barbers").select("*").eq("status", "approved");
    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}
