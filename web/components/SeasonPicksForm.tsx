"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { shortName } from "@/lib/format";
import type { Driver } from "@/lib/types";
import { DriverAvatar } from "@/components/DriverChip";
import Spinner from "@/components/Spinner";

export default function SeasonPicksForm({
  season,
  roster,
  teams,
}: {
  season: number;
  roster: Driver[];
  teams: { team: string; color: string }[];
}) {
  const router = useRouter();
  const [driver, setDriver] = useState<string | null>(null);
  const [team, setTeam] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lockIn() {
    if (!driver || !team) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("season_picks").insert({
      user_id: user?.id,
      season,
      champion_driver: driver,
      champion_team: team,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
          DRIVERS&apos; CHAMPION
        </h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {roster.map((d) => (
            <button
              key={d.driver_id}
              type="button"
              onClick={() => setDriver(d.driver_id)}
              className={`pressable flex items-center gap-2 rounded-control border px-2.5 py-2 text-left transition-colors ${
                driver === d.driver_id
                  ? "border-race bg-race/10"
                  : "border-line bg-glass hover:border-line-hi"
              }`}
            >
              <DriverAvatar driver={d} size={28} />
              <span className="truncate text-xs font-medium">
                {shortName(d.driver_id)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
          CONSTRUCTORS&apos; CHAMPION
        </h2>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {teams.map(({ team: t, color }) => (
            <button
              key={t}
              type="button"
              onClick={() => setTeam(t)}
              className={`pressable flex items-center gap-2.5 rounded-control border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                team === t
                  ? "border-race bg-race/10"
                  : "border-line bg-glass hover:border-line-hi"
              }`}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: color }}
              />
              {t}
            </button>
          ))}
        </div>
      </section>

      {!confirming ? (
        <button
          type="button"
          disabled={!driver || !team}
          onClick={() => setConfirming(true)}
          className="pressable self-start btn-race px-7 py-3 text-sm font-semibold disabled:opacity-45"
        >
          Review my picks
        </button>
      ) : (
        <div className="glass-card p-6">
          <p className="text-sm">
            Locking in <strong>{driver && shortName(driver)}</strong> and{" "}
            <strong>{team}</strong> for the {season} titles.{" "}
            <span className="text-ink-mute">
              This cannot be changed later.
            </span>
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={lockIn}
              disabled={busy}
              className="pressable btn-race flex items-center gap-2 px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy && <Spinner />}
              {busy ? "Locking…" : "Lock it in"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm text-ink-mute hover:text-ink"
            >
              Wait, go back
            </button>
            {error && <span className="text-xs text-race">{error}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
