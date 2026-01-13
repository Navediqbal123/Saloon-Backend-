import bcrypt from "bcryptjs";
import supabase from "../config/supabase.js";
import { generateToken } from "../config/jwt.js";

// SIGNUP
export async function signup(req, res) {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({ email, password: hash })
    .select()
    .single();

  if (error) return res.status(400).json(error);

  const token = generateToken({ id: data.id, email });

  res.json({ token });
}

// LOGIN
export async function login(req, res) {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: "User not found" });
  }

  const match = await bcrypt.compare(password, data.password);
  if (!match) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = generateToken({ id: data.id, email });

  res.json({ token });
}
