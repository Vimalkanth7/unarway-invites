import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lands here from the magic-link email. Supabase's free built-in sender
 * forces the default email template, whose link redirects here with a
 * `code` query param (PKCE) rather than the token_hash we'd otherwise verify
 * ourselves -- exchanging that code is the flow that works unmodified.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/my-invitations`);
    }
    console.error("Auth callback failed:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
