import supabase from "../config/supabase.js";

export async function addService(req, res) {
  try {
    const { name, price, duration, home_service } = req.body;

    // ✅ STEP 1: logged-in user ka barber record nikaalo
    const { data: barber, error: barberError } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .eq("status", "approved")
      .single();

    if (barberError || !barber) {
      return res.status(400).json({ error: "Barber not approved or not registered" });
    }

    // ✅ STEP 2: service insert with REAL barber_id
    const { error } = await supabase.from("services").insert({
      barber_id: barber.id,
      name,
      price,
      duration,
      home_service
    });

    if (error) return res.status(400).json(error);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
