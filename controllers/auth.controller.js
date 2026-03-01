export const signup = async (req, res) => {
  const { email, password, name, role } = req.body; 

  // 1. User Create karo
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    user_metadata: { name }
  });

  if (error) return res.status(400).json(error);

  // 2. Profile Create karo (Admin/User dono ke liye)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: data.user.id,
      name: name,
      email: email,
      role: role || "user" // Agar role nahi aaya toh by-default 'user'
    });

  if (profileError) return res.status(400).json(profileError);

  res.json({ message: "Success", userId: data.user.id });
};
