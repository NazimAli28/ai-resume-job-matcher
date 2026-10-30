"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client, used ONLY to send a file to a one-time signed upload URL. It never queries
 * the database: every table denies the browser roles (RLS with no policies).
 */
export function supabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return createBrowserClient(url, key);
}
