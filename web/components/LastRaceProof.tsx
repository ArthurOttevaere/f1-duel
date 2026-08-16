import { cache } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints, shortName } from "@/lib/format";
import { driverColor } from "@/lib/teams";
import type {
  Driver,
  ModelEntry,
  Race,
  RaceResult,
  SlotScore,
} from "@/lib/types";

/**
 * How a call turned out, in one glyph. The column is the whole argument of
 * this section — the model is good, and it is not perfect — so the three
 * outcomes have to be told apart at a glance rather than read.
 */
const MARKS = {
  exact: { glyph: "✓", label: "exact position", tone: "text-emerald-400" },
  near: { glyph: "~", label: "one off", tone: "text-amber-300" },
  in_top10: { glyph: "•", label: "in the top 10", tone: "text-ink-dim" },
  miss: { glyph: "·", label: "outside the top 10", tone: "text-ink-mute" },
} as const;

type Row = {
  position: number;
  model: { name: string; color: string } | null;
  official: { name: string; color: string } | null;
  kind: SlotScore["kind"];
  points: number | null;
};

function DriverCell({
  driver,
}: {
  driver: { name: string; color: string } | null;
}) {
  if (!driver) return <span className="text-ink-mute">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden
        className="h-4 w-0.5 shrink-0 rounded-full"
        style={{ background: driver.color }}
      />
      <span className="truncate">{driver.name}</span>
    </span>
  );
}

export type LastRace = {
  race: Pick<Race, "round" | "name">;
  rows: Row[];
  total: number;
  exact: number;
};

/**
 * The last scored Grand Prix, as the model played it: its ten picks, what
 * actually happened, and what that was worth.
 *
 * Deduplicated per request, because the hero's scroll cue and the section
 * itself both want it — and both need to know whether it exists at all.
 * Null before the first race of a season is scored: there is no honest
 * version of this block without a result behind it.
 */
export const loadLastRace = cache(async (): Promise<LastRace | null> => {
  const supabase = await createClient();

  const { data: raceRow } = await supabase
    .from("races")
    .select("id, round, name")
    .eq("season", CURRENT_SEASON)
    .eq("status", "scored")
    .order("round", { ascending: false })
    .limit(1)
    .maybeSingle();

  const race = raceRow as Pick<Race, "id" | "round" | "name"> | null;
  if (!race) return null;

  const [entryRes, resultRes, rosterRes] = await Promise.all([
    supabase
      .from("model_entries")
      .select("predicted_order, breakdown, total")
      .eq("race_id", race.id)
      .maybeSingle(),
    supabase
      .from("results")
      .select("classification")
      .eq("race_id", race.id)
      .maybeSingle(),
    supabase
      .from("drivers")
      .select("driver_id, team, team_color")
      .eq("season", CURRENT_SEASON),
  ]);

  const entry = entryRes.data as Pick<
    ModelEntry,
    "predicted_order" | "breakdown" | "total"
  > | null;
  const result = resultRes.data as Pick<RaceResult, "classification"> | null;
  if (!entry || !result) return null;

  const drivers = new Map(
    ((rosterRes.data as Driver[]) ?? []).map((d) => [d.driver_id, d]),
  );
  const cell = (driverId: string | undefined) =>
    driverId
      ? { name: shortName(driverId), color: driverColor(drivers.get(driverId)) }
      : null;

  const finishers = new Map(
    Object.entries(result.classification).map(([driverId, p]) => [p, driverId]),
  );

  const rows: Row[] = Array.from({ length: 10 }, (_, i) => {
    const slot = entry.breakdown?.slots?.[i];
    return {
      position: i + 1,
      model: cell(slot?.driver ?? entry.predicted_order[i]),
      official: cell(finishers.get(i + 1)),
      kind: slot?.kind ?? "miss",
      points: slot?.points ?? null,
    };
  });

  return {
    race,
    rows,
    total: entry.total ?? 0,
    exact: rows.filter((r) => r.kind === "exact").length,
  };
});

/**
 * The proof section of the home page.
 *
 * The page described the game in three sections and never showed it — a
 * visitor was asked to take the whole thing on trust before signing up. This
 * is a server component reading public rows, so it costs no client JavaScript,
 * and it re-tells itself every time a race is scored.
 */
export default async function LastRaceProof() {
  const data = await loadLastRace();
  if (!data) return null;
  const { race, rows, total, exact } = data;

  return (
    <section
      id="last-race"
      className="mx-auto w-[min(64rem,calc(100%-2rem))] scroll-mt-24 py-24"
    >
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
        The last race · Round {race.round}
      </p>
      <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
        The model called the {race.name}. Here&apos;s how it did.
      </h2>
      <p className="mt-4 max-w-xl leading-relaxed text-ink-dim">
        Its ten picks, against the ten drivers who actually finished there.
        Nothing here is a mock-up — it is the entry it filed before the race,
        scored by the same rules as yours.
      </p>

      <div className="glass-card mt-10 overflow-hidden">
        {/* A grid rather than a table with a min-width: this has to read on a
            390px phone, where an `overflow-x-auto` table would put the last
            column — the points, the reason for the section — off the edge with
            nothing on screen to say so. */}
        <div
          role="table"
          aria-label={`The model's top 10 at the ${race.name}, against the official result`}
          // Two driver names, a mark and a score in 342px of phone: the type
          // steps down rather than the last column stepping off the screen.
          className="text-xs sm:text-sm"
        >
          <div
            role="row"
            className="grid grid-cols-[1.75rem_1fr_1.25rem_1fr_2.75rem] items-center gap-x-2 border-b border-line px-3 py-2.5 font-mono text-[0.6rem] tracking-[0.14em] text-ink-mute uppercase sm:gap-x-4 sm:px-5"
          >
            <span role="columnheader">P</span>
            <span role="columnheader">Model</span>
            <span role="columnheader" className="sr-only">
              Outcome
            </span>
            <span role="columnheader">Official</span>
            <span role="columnheader" className="text-right">
              Pts
            </span>
          </div>

          {rows.map((r) => {
            const mark = MARKS[r.kind];
            return (
              <div
                role="row"
                key={r.position}
                className={`grid grid-cols-[1.75rem_1fr_1.25rem_1fr_2.75rem] items-center gap-x-2 border-b border-line/60 px-3 py-2.5 last:border-b-0 sm:gap-x-4 sm:px-5 ${
                  r.kind === "exact" ? "bg-emerald-400/[0.06]" : ""
                }`}
              >
                <span role="cell" className="font-mono text-ink-mute">
                  {r.position}
                </span>
                <span role="cell" className="min-w-0">
                  <DriverCell driver={r.model} />
                </span>
                <span
                  role="cell"
                  title={mark.label}
                  className={`text-center font-mono ${mark.tone}`}
                >
                  {mark.glyph}
                  <span className="sr-only"> {mark.label}</span>
                </span>
                <span role="cell" className="min-w-0 text-ink-dim">
                  <DriverCell driver={r.official} />
                </span>
                <span
                  role="cell"
                  className={`text-right font-mono tabular-nums ${
                    r.points ? "text-ink" : "text-ink-mute"
                  }`}
                >
                  {r.points ? `+${formatPoints(r.points)}` : "0"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-glass px-3 py-3.5 sm:px-5">
          <p className="font-mono text-[0.6rem] tracking-[0.14em] text-ink-mute uppercase">
            {exact} of 10 on the nose
          </p>
          <p className="font-mono text-sm">
            <span className="text-ink-dim">Model total</span>{" "}
            <span className="text-lg font-semibold">
              {formatPoints(total)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold tracking-tight sm:text-xl">
          Could you have done better?
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/game"
            className="pressable rounded-full bg-race px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(255_30_60/0.35)] transition-colors hover:bg-race-deep"
          >
            Play the next duel
          </Link>
          <Link
            href={`/game/races/${race.round}`}
            className="text-sm font-semibold text-ink-dim underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            See the full race →
          </Link>
        </div>
      </div>
    </section>
  );
}
