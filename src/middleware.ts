import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase auth session cookie on every request. Server
 * Components can't write cookies (see server.ts), so without this, a session
 * nearing expiry would never get renewed.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  // Only the real production deployment should ever be indexable -- Vercel
  // preview deployments and plain `next dev` both get a blanket
  // X-Robots-Tag here so a stray branch preview can never outrank (or just
  // duplicate-content-pollute) the real site in search results. VERCEL_ENV
  // is "production" | "preview" | "development"; it's unset locally, which
  // correctly falls into the non-production branch too. This is separate
  // from and in addition to /i/[shortId]'s own always-noindex metadata.
  if (process.env.VERCEL_ENV !== "production") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
