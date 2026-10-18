/**
 * NEXT_PUBLIC_ values only -- this module is imported from client.ts for the
 * browser Supabase client (src/app/login/page.tsx), so it can't carry
 * "server-only" or the service-role key. getSupabaseServiceRoleKey() lives
 * in service-role.ts instead, which does import "server-only" and is the
 * only thing that ever needs it.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
