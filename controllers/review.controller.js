import supabase from "../config/supabase.js";

export async function getMyReviews(req, res) {
  try {
    const { data: barber } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .single();

    if (!barber) return res.status(404).json({ message: "Barber not found" });

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("barber_id", barber.id);

    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}
