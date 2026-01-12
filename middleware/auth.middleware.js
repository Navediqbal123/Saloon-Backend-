import supabase from "../config/supabase.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token missing" });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ 1. Verify user from Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // ✅ 2. Attach user
    req.user = data.user;

    // ✅ 3. OPTIONAL: barber_id auto attach (lifetime fix)
    const { data: barber } = await supabase
      .from("barbers")
      .select("id")
      .eq("user_id", data.user.id)
      .single();

    req.user.barber_id = barber ? barber.id : null;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Auth failed" });
  }
};
