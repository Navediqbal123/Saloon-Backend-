import supabase from "../config/supabase.js"; // ✅ PATH FIXED

export async function registerBarber(req, res) {
  try {
    const { shop_name, location } = req.body;

    const { data, error } = await supabase
      .from("barbers")
      .insert({
        user_id: req.user.id,   // auth middleware se
        shop_name,
        location,
        status: "pending"       // default
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json(error);
    }

    res.json({
      success: true,
      barber_id: data.id       // ✅ ISI ID SE services add hongi
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

export async function approveBarber(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("barbers")
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      return res.status(400).json(error);
    }

    res.json({ approved: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
