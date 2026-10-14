"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [linkError, setLinkError] = useState(false);

  useEffect(() => {
    setLinkError(new URLSearchParams(window.location.search).has("error"));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setLinkError(false);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold">Login</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We&apos;ll email you a link to sign in &mdash; no password needed.
      </p>

      {linkError && status === "idle" && (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          That sign-in link didn&apos;t work. Request a new one below.
        </p>
      )}

      {status === "sent" ? (
        <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Check your email for a sign-in link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="min-h-[44px] rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-600">Something went wrong. Try again.</p>
          )}
        </form>
      )}
    </div>
  );
}
