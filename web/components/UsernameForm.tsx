"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

const RULE = /^[A-Za-z0-9_]{3,20}$/;

type Availability = "idle" | "checking" | "free" | "taken" | "invalid";

/**
 * Pick or change a username. `choose` is the one-time onboarding step every
 * account goes through (Google sign-ups land here with a suggestion);
 * `edit` is the rename control on your own profile.
 */
export default function UsernameForm({
  initial,
  mode,
  next = "/game",
}: {
  initial: string;
  mode: "choose" | "edit";
  next?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [checked, setChecked] = useState<{ name: string; free: boolean } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim();
  const unchanged = trimmed.toLowerCase() === initial.trim().toLowerCase();

  useEffect(() => {
    if (mode === "choose") inputRef.current?.select();
  }, [mode]);

  const status: Availability =
    !trimmed || unchanged
      ? "idle"
      : !RULE.test(trimmed)
        ? "invalid"
        : checked?.name === trimmed
          ? checked.free
            ? "free"
            : "taken"
          : "checking";

  // Availability, debounced — a taken name should be obvious before submitting.
  useEffect(() => {
    if (!trimmed || unchanged || !RULE.test(trimmed)) return;
    const id = setTimeout(async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase.rpc("username_available", {
        p_username: trimmed,
      });
      // On error, stay quiet: the unique index has the last word on save.
      setChecked({ name: trimmed, free: err ? true : Boolean(data) });
    }, 350);
    return () => clearTimeout(id);
  }, [trimmed, unchanged]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!RULE.test(trimmed)) {
      setError("3–20 characters: letters, numbers and underscore only.");
      return;
    }
    if (mode === "edit" && unchanged) return;

    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Your session expired — sign in again.");
      return;
    }

    const { error: err } = await supabase
      .from("profiles")
      .update({ username: trimmed, username_set: true })
      .eq("id", user.id);

    if (err) {
      setSaving(false);
      setError(
        err.code === "23505" || /duplicate|unique/i.test(err.message)
          ? "That name is already taken — try another."
          : err.message,
      );
      return;
    }

    if (mode === "edit") {
      router.replace(`/profile/${trimmed}`);
    } else {
      router.replace(next);
    }
    router.refresh();
  }

  const hint = {
    idle: null,
    checking: (
      <span className="flex items-center gap-1.5 text-ink-mute">
        <Spinner className="text-[0.7rem]" />
        Checking…
      </span>
    ),
    free: <span className="text-emerald-400">{trimmed} is available ✓</span>,
    taken: <span className="text-race">{trimmed} is already taken</span>,
    invalid: (
      <span className="text-ink-mute">
        3–20 characters: letters, numbers and underscore
      </span>
    ),
  }[status];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-black/25 px-4 transition-colors focus-within:border-line-hi">
        <span className="font-mono text-sm text-ink-mute">@</span>
        <input
          ref={inputRef}
          type="text"
          required
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="yourname"
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink-mute"
        />
      </div>

      <p className="min-h-[1.25rem] text-xs">{error ? <span className="text-race">{error}</span> : hint}</p>

      <button
        type="submit"
        disabled={saving || status === "taken" || (mode === "edit" && unchanged)}
        className="pressable flex items-center justify-center gap-2 btn-race py-3 text-sm font-semibold disabled:opacity-45"
      >
        {saving && <Spinner />}
        {saving
          ? "Saving…"
          : mode === "choose"
            ? "Claim this name"
            : "Save username"}
      </button>
    </form>
  );
}
