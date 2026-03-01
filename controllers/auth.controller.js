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

  // 2. Role validate karo (Constraint error se bachne ke liye)
  const validRoles = ["user", "barber", "admin"];
  const finalRole = validRoles.includes(role) ? role : "user";

  // 3. Profile insert karo
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      name: name,
      phone: phone || null,
      role: finalRole
    });

  if (profileError) {
    // Agar profile fail hui toh auth user delete kar do
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return res.status(400).json(profileError);
  }

  res.json({ message: "Success", userId: data.user.id });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json(error);
  res.json({ userId: data.user.id, user: data.user });
};
