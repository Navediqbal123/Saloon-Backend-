import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase.js";

// Signup aur Profile creation ek saath
export const signup = async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name }
  });

  if (error) return res.status(400).json(error);

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      name,
      phone,
      role: role || "user"
    });

  if (profileError) return res.status(400).json(profileError);

  res.json({ message: "Success", userId: data.user.id });
};

// Login function
export const login = async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json(error);
  res.json({ userId: data.user.id });
};

// Khali export (taaki error na aaye)
export const createProfile = async (req, res) => {
  res.json({ message: "Use signup instead" });
};
