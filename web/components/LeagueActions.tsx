"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

    if (mode === "create") {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("leagues")
        .insert({ name: value.trim(), owner_id: user?.id });
      if (err) setError(err.message);
    } else {
      const { error: err } = await supabase.rpc("join_league", {
        p_code: value.trim(),
      });
      if (err)
        setError(
          err.message.includes("Unknown") ? "No league with that code." : err.message,
        );
    }

    setBusy(false);
    if (!error) {
      setMode("idle");
      setValue("");
      router.refresh();
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
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
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={mode === "create" ? "League name" : "6-letter code"}
        minLength={mode === "create" ? 3 : 6}
        maxLength={mode === "create" ? 30 : 6}
        required
        className="rounded-full border border-line bg-black/25 px-4 py-2 text-sm outline-none placeholder:text-ink-mute focus:border-line-hi"
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
      {error && <span className="text-xs text-race">{error}</span>}
    </form>
  );
}
