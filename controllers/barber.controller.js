export async function approveBarber(req, res) {
  try {
    const { id } = req.params; // Barber request ID
    const { user_id } = req.body; // Isse user_id bhi bhejna padega frontend se

    // 1. Barber table update
    await supabase.from("barbers").update({ status: "approved" }).eq("id", id);

    // 2. MAIN FIX: Profiles table mein role change (Taki refresh par na hate)
    const { error } = await supabase.from("profiles").update({ role: "barber" }).eq("id", user_id);

    if (error) return res.status(400).json(error);
    return res.json({ success: true, message: "Barber Approved & Role Updated!" });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
