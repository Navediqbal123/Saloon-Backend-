import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // ✅ Supabase tokens use 'sub' for user ID, not 'id'
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);

    req.user = {
      id: decoded.sub, // Supabase user ID yahan hota hai
      email: decoded.email,
      role: decoded.user_metadata?.role || "user",
    };

    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
