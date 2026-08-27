"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

export type ProfileTheme = "driver" | "team";

/**
 * Which half of the championship call paints the profile.
 *
 * The page is coloured end to end by the pick — cover, avatar ring, curve,
 * stubs — and until migration 0010 that colour was always the constructor's.
 * A driver and their team are frequently two shades of the same hue, so the
 * one identity choice on the site was invisible half the time. This is the
 * switch; `driver` is the default, because the portrait of that driver is
 * already the face of the page.
 *
 * Two swatches, not a dropdown: there are exactly two values and both of them
 * are colours, so the control shows them rather than naming them. The pressed
 * one carries `aria-pressed` and a full-strength ring, so the state is not
 * colour alone (§1.2).
 *
 * If the column isn't there yet the save fails loudly and the page keeps
 * working on `driver` — a migration that hasn't run should cost the feature,
 * not the profile.
 */
export default function ProfileThemeToggle({
  initial,
  driverColor,
  teamColor,
  driverLabel,
  teamLabel,
}: {
  initial: ProfileTheme;
  driverColor: string;
  teamColor: string;
  driverLabel: string;
  teamLabel: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ProfileTheme>(initial);
  const [busy, setBusy] = useState<ProfileTheme | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: ProfileTheme) {
    if (next === value || busy) return;
    setBusy(next);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(null);
      setError("Your session expired — sign in again.");
      return;
    }
    const { error: err } = await supabase
      .from("profiles")
      .update({ theme: next })
      .eq("id", auth.user.id);
    setBusy(null);
    if (err) {
      setError(
        err.message.includes("theme")
          ? "Profile colours aren't enabled on this server yet."
          : err.message,
      );
      return;
    }
    setValue(next);
    router.refresh();
  }

  const option = (
    key: ProfileTheme,
    color: string,
    label: string,
    caption: string,
  ) => {
    const on = value === key;
    return (
      <button
        type="button"
        onClick={() => choose(key)}
        aria-pressed={on}
        disabled={busy !== null}
        className={`pressable flex flex-1 items-center gap-3 rounded-control border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
          on ? "border-line-hi bg-glass-strong" : "border-line hover:border-line-hi"
        }`}
      >
        <span
          aria-hidden
          className="size-5 shrink-0 rounded-full"
          style={{
            background: color,
            boxShadow: on ? `0 0 0 3px rgb(255 255 255 / 0.14)` : "none",
          }}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block truncate font-mono text-[0.6rem] tracking-[0.14em] text-ink-mute uppercase">
            {caption}
          </span>
        </span>
        {busy === key && <Spinner />}
      </button>
    );
  };

  return (
    <div>
      <div className="flex gap-2">
        {option("driver", driverColor, driverLabel, "your driver")}
        {option("team", teamColor, teamLabel, "your team")}
      </div>
      {error && <p className="mt-2 text-xs text-race">{error}</p>}
    </div>
  );
}
