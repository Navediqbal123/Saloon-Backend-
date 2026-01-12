import { createClient } from "@supabase/supabase-js";

export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ye niche wali line add ki hai, isse error fix ho jayega
export default supabaseAuth;
