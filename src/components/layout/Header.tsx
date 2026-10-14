import Link from "next/link";
import { categories } from "@/lib/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Unarway Invites
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="hidden text-neutral-700 hover:text-neutral-950 sm:inline"
            >
              {category.label}
            </Link>
          ))}
          <Link href="/my-invitations" className="text-neutral-700 hover:text-neutral-950">
            My invitations
          </Link>
          {user ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-neutral-900 hover:border-neutral-500"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-neutral-300 px-4 py-1.5 text-neutral-900 hover:border-neutral-500"
            >
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
