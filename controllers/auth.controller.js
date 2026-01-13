import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase.js";

/* ================= SIGNUP ================= */
export const signup = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) return res.status(400).json(error);

  const token = jwt.sign(
    { id: data.user.id, email: data.user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
};

/* ================= LOGIN ================= */
export const login = async (req, res) => {
  const { email, password } = req.body;

  const { data, error } =
    await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

  if (error) return res.status(401).json(error);

  const token = jwt.sign(
    { id: data.user.id, email: data.user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
};

/* ================= CREATE PROFILE ================= */
export const createProfile = async (req, res) => {
  const { role, name, phone } = req.body;
  const userId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert([
      {
        id: userId,
        role,
        name,
        phone
      }
    ]);

  if (error) return res.status(400).json(error);

  res.json({
    success: true,
    message: "Profile created"
  });
};
