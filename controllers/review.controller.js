import supabase from "../config/supabase.js";

// =======================
// 1. GET MY REVIEWS (BARBER)
// =======================
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
      .select("*, profiles(full_name, avatar_url)")
      .eq("barber_id", barber.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// =======================
// 2. ADD REVIEW (CUSTOMER)
// =======================
export async function addReview(req, res) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { barber_id, rating, comment } = req.body;

    if (!barber_id || !rating) {
      return res.status(400).json({ error: "barber_id and rating are required" });
    }

    const { error } = await supabase
      .from("reviews")
      .insert({
        barber_id,
        customer_id: req.user.id,
        rating,
        comment: comment || "",
        created_at: new Date().toISOString()
      });

    if (error) return res.status(400).json(error);

    res.json({ success: true, message: "Review added successfully" });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}

// =======================
// 3. GET ALL REVIEWS OF A BARBER (PUBLIC)
// =======================
export async function getBarberReviews(req, res) {
  try {
    const { barber_id } = req.params;

    if (!barber_id) {
      return res.status(400).json({ error: "barber_id required" });
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*, profiles(full_name, avatar_url)")
      .eq("barber_id", barber_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json(error);
    res.json(data);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}
