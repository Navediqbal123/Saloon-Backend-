import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../config/supabase.js";

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
