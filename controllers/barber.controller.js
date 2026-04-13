import supabase from "../config/supabase.js";

// 1. Register Barber
export async function registerBarber(req, res) {
  try {
    const { shop_name, location } = req.body;
    const { data, error } = await supabase.from("barbers").insert({
      user_id: req.user.id,
      shop_name,
      location,
      status: "approved"
    }).select().single();
    if (error) return res.status(400).json(error);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// 2. Approve Barber
export async function approveBarber(req, res) {
  try {
    const { id, user_id } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({ error: "Missing id or user_id" });
    }

    await supabase.from("barbers").update({ status: "approved" }).eq("id", id);

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

// 5. Get My Barber Profile
export async function getMyBarberProfile(req, res) {
  try {
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Barber profile not found" });

    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}
