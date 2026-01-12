import supabase from "../config/supabase.js"; // ✅ PATH FIXED

export async function createProfile(req, res) {
  try {
    const { role, name, phone } = req.body;

    // user middleware se aa raha hai
    const userId = req.user.id;

    const { error } = await supabase.from("profiles").insert({
      id: userId,        // auth.users ka same id
      role,
      name,
      phone
    });

    if (error) {
      return res.status(400).json(error);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
