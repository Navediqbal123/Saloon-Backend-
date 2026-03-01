import { supabaseAdmin } from "../config/supabase.js";

export const signup = async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  // 1. Auth User Create karo
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name }
  });

  if (error) return res.status(400).json(error);

  // 2. Sirf wahi role bhejo jo database allow karta hai ('user', 'barber', ya 'admin')
  // Agar koi faltu role bheja, toh default 'user' set ho jayega.
  const allowedRoles = ["user", "barber", "admin"];
  const finalRole = allowedRoles.includes(role) ? role : "user";

  // 3. Profile Create karo
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      name: name,
      phone: phone || "",
      role: finalRole // Yahan ab kabhi error nahi aayega
    });

  if (profileError) {
    // Agar profile nahi bani, toh user ko delete karo (cleanup)
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return res.status(400).json({ error: "Profile creation failed", details: profileError });
  }

  res.json({ message: "Success", userId: data.user.id });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json(error);
  res.json({ userId: data.user.id });
};
