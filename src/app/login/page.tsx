"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

const COOLDOWN_SECONDS = 60;

function describeError(status: number | undefined, code: string | undefined): {
  message: string;
  showCode: boolean;
} {
  if (status === 429 || code === "over_email_send_rate_limit") {
    return { message: "Too many emails requested. Please wait about an hour and try again.", showCode: false };
  }
  if (code === "email_address_invalid") {
    return { message: "Enter a valid email address.", showCode: false };
  }
  return { message: "Something went wrong. Try again.", showCode: true };
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [linkError, setLinkError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setLinkError(new URLSearchParams(window.location.search).has("error"));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setLinkError(false);
    setErrorMessage(null);
    setErrorCode(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setCooldown(COOLDOWN_SECONDS);

    if (error) {
      // Safe to log: AuthError messages/codes describe the failure, never
      // tokens or keys.
      console.error("signInWithOtp failed:", error);
      const { message, showCode } = describeError(error.status, error.code);
      setErrorMessage(message);
      setErrorCode(showCode ? error.code ?? String(error.status ?? "unknown") : null);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  const sendDisabled = status === "sending" || cooldown > 0;

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

      {status === "sent" && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
          Check your email for a sign-in link.
        </p>
      )}

      {status === "error" && errorMessage && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p>{errorMessage}</p>
          {errorCode && <p className="mt-1 text-xs text-red-800/60">Error code: {errorCode}</p>}
        </div>
      )}

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
          disabled={sendDisabled}
          className="min-h-[44px] rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "sending"
            ? "Sending…"
            : cooldown > 0
              ? `Send magic link (wait ${cooldown}s)`
              : "Send magic link"}
        </button>
      </form>
    </div>
  );
}
