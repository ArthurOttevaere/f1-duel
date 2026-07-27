"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/game`,
        data: username ? { username } : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/game` },
    });
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4">
      <div className="aurora" />

      <Link
        href="/"
        className="mb-10 font-mono text-sm font-semibold tracking-widest"
      >
        <span className="text-race">F1</span> DUEL
      </Link>

      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="text-xl font-bold">Join the duel</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Sign in — or create your account in one step.
        </p>

        {status === "sent" ? (
          <div className="mt-6 rounded-xl border border-line bg-glass p-4 text-sm">
            <p className="font-medium">Check your inbox 📬</p>
            <p className="mt-1 text-ink-dim">
              We sent a sign-in link to <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-xl border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (new players)"
              pattern="[A-Za-z0-9_]{3,20}"
              title="3–20 characters: letters, numbers, underscore"
              className="rounded-xl border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="pressable rounded-xl bg-race py-3 text-sm font-semibold text-white transition-colors hover:bg-race-deep disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-sm text-race">{error}</p>}
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-ink-mute">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="pressable glass-chip w-full rounded-xl py-3 text-sm font-semibold transition-colors hover:border-line-hi"
        >
          Continue with Google
        </button>
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-ink-mute">
        No password, no spam — your email is only used to sign you in.
      </p>
    </main>
  );
}
