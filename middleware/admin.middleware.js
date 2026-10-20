import supabase from "../config/supabase.js";

const ADMIN_EMAIL = "dibazhar0.9@gmail.com";

export async function adminMiddleware(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", req.user.id)
      .maybeSingle();

    if (error || data?.email?.toLowerCase() !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
}
