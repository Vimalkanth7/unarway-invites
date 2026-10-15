import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

/**
 * Bypasses RLS. Server-only (webhook handler, download gating). Never import
 * this from a Client Component or a module reachable by one.
 */
export function createSupabaseServiceRoleClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
