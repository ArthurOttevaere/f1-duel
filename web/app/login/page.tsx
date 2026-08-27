"use client";

import { useEffect, useState } from "react";
import Wordmark from "@/components/Wordmark";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";
import PlayerDetailsFields, {
  detailsError,
  detailsPayload,
  EMPTY_DETAILS,
  type Details,
} from "@/components/PlayerDetailsFields";

type Mode = "signin" | "signup";
type Status = "idle" | "working" | "sent-link" | "sent-verify" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [details, setDetails] = useState<Details>(EMPTY_DETAILS);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Where to land afterwards. An invite link sends people here with
  // ?next=/join/<code>, and dropping them on /game instead would lose the
  // league they came to join.
  const [next, setNext] = useState("/game");

  // Surface redirect params. Runs once after mount because the query string is
  // only known on the client (avoids useSearchParams + Suspense).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time client-only URL read */
    const params = new URLSearchParams(window.location.search);
    const to = params.get("next");
    // Only ever bounce back inside the app.
    if (to && to.startsWith("/") && !to.startsWith("//")) setNext(to);
    if (params.get("error") === "auth") {
      setStatus("error");
      setError("That sign-in link was invalid or expired. Try again.");
    }
    if (params.get("signedout") === "1") {
      setNotice("You've been signed out.");
    }
    if (params.get("deleted") === "1") {
      setNotice("Your account and everything attached to it are gone.");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
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
      router.push(next);
      router.refresh();
      return;
    }

    const invalid = detailsError(details);
    if (invalid) {
      setStatus("error");
      setError(invalid);
      return;
    }

    // Say it now rather than handing out `name1` after the account exists.
    const name = username.trim();
    const { data: free } = await supabase.rpc("username_available", {
      p_username: name,
    });
    if (free === false) {
      setStatus("error");
      setError("That username is already taken — pick another.");
      return;
    }

    // Sign up: verify email once, then it's password-only forever after. The
    // details ride along as user metadata — handle_new_user() copies them into
    // player_details, which only exists once the account does.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        data: { username: name, ...detailsPayload(details) },
      },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    // If email confirmation is off, Supabase returns a live session — go straight in.
    if (data.session) {
      router.push(next);
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
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
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
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  const working = status === "working";
  const sent = status === "sent-link" || status === "sent-verify";

  return (
    <main
      id="content"
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-16"
    >
      <div className="page-glow" />

      <Link
        href="/"
        className="mb-8"
      >
        <Wordmark />
      </Link>

      <div className="glass-card w-full max-w-sm p-6 sm:p-8">
        {sent ? (
          <div className="text-center">
            <p className="text-3xl">📬</p>
            <h1 className="display mt-3 text-xl font-extrabold tracking-tight">Check your inbox</h1>
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
            {notice && (
              <div className="mb-5 rounded-control border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                {notice}
              </div>
            )}

            {/* C-2: a two-half capsule with the active side filled red used
                to sit here — the segmented control is the default component of
                every generated sign-in screen, and it asks for a decision
                before the first field. There is one form now; the heading says
                which one it is, and the line under the button switches it. */}
            <h1 className="display text-xl font-extrabold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Join the duel"}
            </h1>
            <p className="mt-1 text-sm text-ink-dim">
              {mode === "signin"
                ? "Sign in with your email and password."
                : "Your username is what other players see — the rest stays private."}
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
                className="rounded-control border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
              />

              {mode === "signup" && (
                <>
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
                    className="rounded-control border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
                  />

                  <PlayerDetailsFields
                    value={details}
                    onChange={(d) => {
                      setDetails(d);
                      resetMessages();
                    }}
                    disabled={working}
                  />
                </>
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
                className="rounded-control border border-line bg-black/25 px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi"
              />

              <button
                type="submit"
                disabled={working}
                className="pressable flex items-center justify-center gap-2 btn-race py-3 text-sm font-semibold disabled:opacity-60"
              >
                {working && <Spinner />}
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

            {/* The whole of the mode switch: one line of text, where the
                decision actually comes up. */}
            <p className="mt-4 text-center text-sm text-ink-mute">
              {mode === "signin" ? "First time here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  resetMessages();
                }}
                className="pressable font-medium text-ink-dim underline underline-offset-4 transition-colors hover:text-ink"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>

            <div className="my-5 flex items-center gap-3 text-xs text-ink-mute">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              onClick={signInWithGoogle}
              className="pressable glass-chip w-full rounded-control py-3 text-sm font-semibold transition-colors hover:border-line-hi"
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
        </Link>{" "}
        or{" "}
        <Link href="/privacy" className="underline">
          what we do with your data
        </Link>
      </p>
    </main>
  );
}
