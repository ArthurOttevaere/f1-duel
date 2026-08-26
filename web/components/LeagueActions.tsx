"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { standingsHref } from "@/lib/nav";
import Spinner from "@/components/Spinner";
import { createClient } from "@/lib/supabase/client";

/** Accepts a bare code or a pasted invite link — both are "what my friend sent me". */
function codeFrom(value: string): string {
  const trimmed = value.trim();
  const fromLink = trimmed.match(/\/join\/([A-Za-z0-9]+)/);
  return (fromLink ? fromLink[1] : trimmed).toUpperCase();
}

/**
 * The last pill in the standings filter: make a league, or join one.
 *
 * It renders as two siblings — the pill itself, and (when open) a panel that
 * takes a full row of its own. Both are direct children of the filter's
 * `flex-wrap` row, which is what `basis-full` is for: the panel drops onto its
 * own line instead of squeezing the pills.
 */
export default function LeagueActions({ hasLeagues }: { hasLeagues: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setMode("idle");
    setValue("");
    setError(null);
  }

  function switchTo(next: "create" | "join") {
    setMode(next);
    setValue("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    let failure: string | null = null;
    let landOn: number | null = null;

    if (mode === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Selecting the new row back gives us somewhere to send them: a league
      // you just made is the one you want to look at.
      const { data, error: err } = await supabase
        .from("leagues")
        .insert({ name: value.trim(), owner_id: user?.id })
        .select("id")
        .single();
      failure = err?.message ?? null;
      landOn = (data as { id: number } | null)?.id ?? null;
    } else {
      const { data, error: err } = await supabase.rpc("join_league", {
        p_code: codeFrom(value),
      });
      failure = err
        ? err.message.includes("Unknown")
          ? "No league with that code."
          : err.message
        : null;
      landOn = typeof data === "number" ? data : null;
    }

    setBusy(false);
    // Read the failure we just got rather than the `error` state, which is
    // still the previous render's value here: a failed join used to close the
    // form and look exactly like a successful one.
    if (failure) {
      setError(failure);
      return;
    }
    close();
    startTransition(() => {
      router.push(standingsHref(landOn), { scroll: false });
      // The pill row is server data; without this the league we just joined
      // would not be in it.
      router.refresh();
    });
  }

  const tab = (active: boolean) =>
    `pressable rounded-control px-3.5 py-1 text-xs font-semibold transition-colors ${
      active ? "bg-race text-white" : "text-ink-dim hover:text-ink"
    }`;

  return (
    <>
      <button
        type="button"
        onClick={() => (mode === "idle" ? switchTo("create") : close())}
        aria-expanded={mode !== "idle"}
        className={`pressable rounded-control px-4 py-1.5 text-sm font-medium transition-colors ${
          mode === "idle"
            ? "glass-chip text-ink-mute hover:text-ink"
            : "glass-chip text-ink"
        }`}
      >
        {hasLeagues ? "+ League" : "Play with friends"}
      </button>

      {mode !== "idle" && (
        <div className="glass-card basis-full p-4 sm:p-5">
          <div className="inline-flex gap-1 rounded-control border border-line bg-black/25 p-1">
            <button type="button" onClick={() => switchTo("create")} className={tab(mode === "create")}>
              Create
            </button>
            <button type="button" onClick={() => switchTo("join")} className={tab(mode === "join")}>
              Join
            </button>
          </div>

          <form onSubmit={submit} className="mt-3 flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder={mode === "create" ? "League name" : "Code or invite link"}
              minLength={mode === "create" ? 3 : 6}
              maxLength={mode === "create" ? 30 : 200}
              autoCapitalize={mode === "create" ? "words" : "characters"}
              autoComplete="off"
              required
              className="min-w-0 flex-1 rounded-control border border-line bg-black/25 px-4 py-2 text-sm outline-none placeholder:text-ink-mute focus:border-line-hi sm:max-w-xs sm:flex-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="pressable flex items-center gap-2 btn-race px-5 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {busy && <Spinner />}
              {mode === "create"
                ? busy
                  ? "Creating"
                  : "Create"
                : busy
                  ? "Joining"
                  : "Join"}
            </button>
            <button
              type="button"
              onClick={close}
              className="px-1 text-sm text-ink-mute transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </form>

          <p className="mt-2.5 max-w-prose text-xs text-ink-mute">
            {mode === "create"
              ? "A private board scored exactly like the global one — you just see your friends instead of everyone. You'll get an invite link to send."
              : "Paste the six-letter code or the whole invite link a friend sent you."}
          </p>
          {error && <p className="mt-2 text-xs text-race">{error}</p>}
        </div>
      )}
    </>
  );
}
