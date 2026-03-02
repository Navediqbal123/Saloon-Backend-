import { supabaseAdmin } from "../config/supabase.js";


// 🔥 SIGNUP
export const signup = async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name }
  });

  if (error) return res.status(400).json(error);

  const allowedRoles = ["user", "barber", "admin"];
  const finalRole = allowedRoles.includes(role) ? role : "user";

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      name: name,
      phone: phone || "",
      role: finalRole
    });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return res.status(400).json({ error: "Profile creation failed", details: profileError });
  }

  res.json({ message: "Signup Success", userId: data.user.id });
};



// 🔥 LOGIN (COOKIE SESSION)
export const login = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(401).json(error);

  // ✅ COOKIE SET — VERY IMPORTANT
  res.cookie("sb-session", data.session.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    message: "Login Success",
    userId: data.user.id
  });
};
