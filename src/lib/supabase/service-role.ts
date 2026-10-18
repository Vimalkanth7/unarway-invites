import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

function getSupabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Missing required env var: SUPABASE_SERVICE_ROLE_KEY");
  return value;
}

/**
 * Bypasses RLS. Server-only (webhook handler, download gating). Never import
 * this from a Client Component or a module reachable by one -- the
 * "server-only" import above makes that a build error, not just a lint
 * warning, if it's ever imported from one.
 */
export function createSupabaseServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
