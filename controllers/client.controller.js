import supabase from "../config/supabase.js";

export async function getMyClients(req, res) {
  try {
    const { data: barber } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", req.user.id)
      .single();

    if (!barber) return res.status(404).json({ message: "Barber not found" });

    const { data, error } = await supabase
      .from("bookings")
      .select("client_id, profiles(id, full_name, phone)")
      .eq("barber_id", barber.id);

    if (error) return res.status(400).json(error);

    // Unique clients
    const unique = Object.values(
      data.reduce((acc, row) => {
        if (row.profiles && !acc[row.client_id]) {
          acc[row.client_id] = row.profiles;
        }
        return acc;
      }, {})
    );

    res.json(unique);
  } catch (err) { res.status(500).json({ error: "Server error" }); }
}
