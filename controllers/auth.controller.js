import { supabaseAdmin } from "../config/supabase.js";

// Signup aur Profile creation ek saath
export const signup = async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  // 1. Auth User Create karo
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name }
  });

  if (error) return res.status(400).json(error);

  // 2. Profile Create karo (Role validation ke saath)
  // Constraint error se bachne ke liye allowed roles define kiye hain
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
    // Agar profile nahi bani, toh user delete kar do (Cleanup)
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return res.status(400).json(profileError);
  }

  res.json({ message: "Success", userId: data.user.id });
};

// Login function
export const login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json(error);
  res.json({ userId: data.user.id, user: data.user });
};
