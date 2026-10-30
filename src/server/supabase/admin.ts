import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/** Service client (secret key). Server-only; used for admin auth operations like deleting a user. */
export function supabaseAdmin() {
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.SUPABASE_SECRET_KEY) throw new Error("Supabase admin env is not set");
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
