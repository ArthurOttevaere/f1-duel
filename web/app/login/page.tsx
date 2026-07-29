"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";
type Status = "idle" | "working" | "sent-link" | "sent-verify" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Surface the ?error=auth redirect. Runs once after mount because the query
  // string is only known on the client (avoids useSearchParams + Suspense).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only URL read
      setStatus("error");
      setError("That sign-in link was invalid or expired. Try again.");
    }
  }, []);

  function resetMessages() {
    setError(null);
    if (status !== "working") setStatus("idle");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError(null);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus("error");
        setError(error.message);
        return;
      }
      router.push("/game");
      router.refresh();
      return;
    }

    // Sign up: verify email once, then it's password-only forever after.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/confirm?next=/game`,
        data: { username },
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    // If email confirmation is off, Supabase returns a live session — go straight in.
    if (data.session) {
      router.push("/game");
      router.refresh();
      return;
    }
    setStatus("sent-verify");
  }

  async function sendMagicLink() {
    if (!email) {
      setStatus("error");
      setError("Enter your email first, then request a link.");
      return;
    }
    setStatus("working");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/game` },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("sent-link");
    }
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/game` },
    });
  }

  const working = status === "working";
  const sent = status === "sent-link" || status === "sent-verify";

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div className="aurora" />

      <Link
        href="/"
        className="mb-8 font-mono text-sm font-semibold tracking-widest"
      >
        <span className="text-race">F1</span> DUEL
      </Link>

      <div className="glass-card w-full max-w-sm p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <p className="text-3xl">📬</p>
            <h1 className="mt-3 text-xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-ink-dim">
              {status === "sent-verify" ? (
                <>
                  We sent a verification link to <strong>{email}</strong>.
                  Confirm it once — after that you sign in with just your email
                  and password.
                </>
              ) : (
                <>
                  We sent a one-time sign-in link to <strong>{email}</strong>.
                </>
              )}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setMode("signin");
              }}
              className="mt-6 text-sm text-race underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="glass-chip flex rounded-full p-1 text-sm">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    resetMessages();
                  }}
                  className={`flex-1 rounded-full py-2 font-medium transition-colors ${
                    mode === m
                      ? "bg-race text-white"
                      : "text-ink-dim hover:text-ink"
                  }`}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h1 className="mt-6 text-xl font-bold">
              {mode === "signin" ? "Welcome back" : "Join the duel"}
            </h1>
            <p className="mt-1 text-sm text-ink-dim">
              {mode === "signin"
                ? "Sign in with your email and password."
                : "Verify your email once — then it's password-only."}
            </p>

            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetMessages();
                }}
                placeholder="you@example.com"
                className="rounded-xl border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
              />

              {mode === "signup" && (
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    resetMessages();
                  }}
                  placeholder="Username"
                  pattern="[A-Za-z0-9_]{3,20}"
                  title="3–20 characters: letters, numbers, underscore"
                  className="rounded-xl border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
                />
              )}

              <input
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  resetMessages();
                }}
                placeholder={
                  mode === "signin" ? "Password" : "Password (8+ characters)"
                }
                className="rounded-xl border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
              />

              <button
                type="submit"
                disabled={working}
                className="pressable rounded-xl bg-race py-3 text-sm font-semibold text-white transition-colors hover:bg-race-deep disabled:opacity-60"
              >
                {working
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>

              {error && <p className="text-sm text-race">{error}</p>}
            </form>

            {mode === "signin" && (
              <button
                type="button"
                onClick={sendMagicLink}
                disabled={working}
                className="mt-3 w-full text-center text-xs text-ink-mute underline transition-colors hover:text-ink-dim"
              >
                Forgot your password? Email me a one-time link instead
              </button>
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
          </>
        )}
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-ink-mute">
        By continuing you agree this is an unofficial fan project.{" "}
        <Link href="/rules" className="underline">
          Read the rules
        </Link>
      </p>
    </main>
  );
}
