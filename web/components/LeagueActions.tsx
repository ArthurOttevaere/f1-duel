"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Accepts a bare code or a pasted invite link — both are "what my friend sent me". */
function codeFrom(value: string): string {
  const trimmed = value.trim();
  const fromLink = trimmed.match(/\/join\/([A-Za-z0-9]+)/);
  return (fromLink ? fromLink[1] : trimmed).toUpperCase();
}

export default function LeagueActions() {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    let failure: string | null = null;
    if (mode === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("leagues")
        .insert({ name: value.trim(), owner_id: user?.id });
      failure = err?.message ?? null;
    } else {
      const { error: err } = await supabase.rpc("join_league", {
        p_code: codeFrom(value),
      });
      failure = err
        ? err.message.includes("Unknown")
          ? "No league with that code."
          : err.message
        : null;
    }

    setBusy(false);
    // Read the failure we just got rather than the `error` state, which is
    // still the previous render's value here: a failed join used to close the
    // form and look exactly like a successful one.
    if (failure) {
      setError(failure);
      return;
    }
    setMode("idle");
    setValue("");
    router.refresh();
  }

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode("create")}
          className="pressable rounded-full bg-race px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-race-deep"
        >
          Create a league
        </button>
        <button
          onClick={() => setMode("join")}
          className="pressable glass-chip rounded-full px-5 py-2 text-sm font-semibold transition-colors hover:border-line-hi"
        >
          Join with a code
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
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
        className="min-w-0 flex-1 rounded-full border border-line bg-black/25 px-4 py-2 text-sm outline-none placeholder:text-ink-mute focus:border-line-hi sm:flex-none"
      />
      <button
        type="submit"
        disabled={busy}
        className="pressable rounded-full bg-race px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "…" : mode === "create" ? "Create" : "Join"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode("idle");
          setError(null);
        }}
        className="text-sm text-ink-mute hover:text-ink"
      >
        Cancel
      </button>
      {error && <span className="w-full text-xs text-race sm:w-auto">{error}</span>}
    </form>
  );
}
