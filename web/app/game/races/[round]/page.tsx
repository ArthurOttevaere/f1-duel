import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints, multiplierLabel, shortName } from "@/lib/format";
import type {
  Driver,
  ModelEntry,
  Prediction,
  Profile,
  Race,
  RaceResult,
  Score,
  SlotScore,
} from "@/lib/types";

export const revalidate = 120;

function slotTone(kind: SlotScore["kind"] | undefined): string {
  switch (kind) {
    case "exact":
      return "text-emerald-400";
    case "near":
      return "text-amber-300";
    case "in_top10":
      return "text-ink-dim";
    default:
      return "text-ink-mute";
  }
}

function PickCell({
  driverId,
  slot,
  drivers,
}: {
  driverId: string | undefined;
  slot: SlotScore | undefined;
  drivers: Map<string, Driver>;
}) {
  if (!driverId) return <td className="px-3 py-2 text-ink-mute">—</td>;
  const d = drivers.get(driverId);
  return (
    <td className="px-3 py-2">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-4 w-0.5 rounded-full"
          style={{ background: d?.team_color ?? "#6c7280" }}
        />
        <span className={`truncate text-sm ${slotTone(slot?.kind)}`}>
          {shortName(driverId)}
        </span>
        {slot && slot.points > 0 && (
          <span className="ml-auto font-mono text-xs text-ink-dim">
            +{formatPoints(slot.points)}
            {slot.multiplier > 1 && (
              <span className="ml-1 text-race">
                {multiplierLabel(slot.multiplier)}
              </span>
            )}
          </span>
        )}
      </span>
    </td>
  );
}

export default async function RaceReviewPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const { round } = await params;
  const supabase = await createClient();

  const { data: raceRow } = await supabase
    .from("races")
    .select("*")
    .eq("season", CURRENT_SEASON)
    .eq("round", Number(round))
    .maybeSingle();
  const race = raceRow as Race | null;
  if (!race) notFound();
  if (race.status === "scheduled") redirect("/game");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [entryRes, resultRes, rosterRes, scoresRes, predsRes, profilesRes] =
    await Promise.all([
      supabase.from("model_entries").select("*").eq("race_id", race.id).maybeSingle(),
      supabase.from("results").select("*").eq("race_id", race.id).maybeSingle(),
      supabase.from("drivers").select("*").eq("season", race.season),
      supabase
        .from("scores")
        .select("*")
        .eq("race_id", race.id)
        .order("total", { ascending: false }),
      supabase.from("predictions").select("*").eq("race_id", race.id),
      supabase.from("profiles").select("id, username, created_at"),
    ]);

  const entry = entryRes.data as ModelEntry | null;
  const result = resultRes.data as RaceResult | null;
  const drivers = new Map(
    ((rosterRes.data as Driver[]) ?? []).map((d) => [d.driver_id, d]),
  );
  const scores = (scoresRes.data as Score[]) ?? [];
  const predictions = (predsRes.data as Prediction[]) ?? [];
  const profiles = new Map(
    ((profilesRes.data as Profile[]) ?? []).map((p) => [p.id, p]),
  );

  const myScore = user ? scores.find((s) => s.user_id === user.id) : undefined;
  const myPrediction = user
    ? predictions.find((p) => p.user_id === user.id)
    : undefined;

  const actualOrder: (string | undefined)[] = Array.from({ length: 10 }, (_, i) => {
    if (!result) return undefined;
    return Object.entries(result.classification).find(([, p]) => p === i + 1)?.[0];
  });

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-ink-mute">
        <Link href="/game" className="hover:text-ink">
          ← This weekend
        </Link>
      </nav>

      <header>
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          Round {race.round} · {race.country}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{race.name}</h1>
      </header>

      {/* ── Duel banner ── */}
      {race.status === "scored" && myScore && (
        <section
          className={`glass-card flex items-center justify-between p-6 ${
            myScore.beat_model
              ? "border-emerald-400/40"
              : myScore.drew_model
                ? "border-amber-300/40"
                : "border-race/40"
          }`}
        >
          <div>
            <p className="text-sm text-ink-dim">
              {myScore.beat_model
                ? "You beat the model 🎉"
                : myScore.drew_model
                  ? "Dead heat with the model"
                  : "The model takes this one"}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {formatPoints(myScore.total)}{" "}
              <span className="text-ink-mute">—</span>{" "}
              {formatPoints(entry?.total ?? 0)}
            </p>
          </div>
          <div className="text-right text-xs text-ink-mute">
            <p>you · model</p>
            {(myScore.breakdown.bonuses?.duel ?? 0) > 0 && (
              <p className="mt-1 text-emerald-400">
                +{formatPoints(myScore.breakdown.bonuses.duel)} duel bonus
              </p>
            )}
          </div>
        </section>
      )}

      {race.status === "locked" && (
        <p className="glass-chip rounded-2xl px-5 py-3 text-sm text-ink-dim">
          🏁 Race locked — scoring lands once the official classification is in.
        </p>
      )}

      {/* ── Side-by-side ── */}
      <section className="glass-card overflow-x-auto p-2">
        <table className="w-full min-w-[36rem] border-separate border-spacing-0">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wider text-ink-mute uppercase">
              <th className="px-3 py-2 font-medium">Pos</th>
              <th className="px-3 py-2 font-medium">You</th>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Official</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, i) => {
              const mySlot = myScore?.breakdown.slots[i];
              const modelSlot = entry?.breakdown?.slots?.[i];
              return (
                <tr key={i} className="border-t border-line">
                  <td className="w-12 px-3 py-2 font-mono text-sm text-ink-mute">
                    P{i + 1}
                  </td>
                  <PickCell
                    driverId={myPrediction?.picks[i]}
                    slot={mySlot}
                    drivers={drivers}
                  />
                  <PickCell
                    driverId={entry?.predicted_order[i]}
                    slot={modelSlot}
                    drivers={drivers}
                  />
                  <PickCell
                    driverId={actualOrder[i]}
                    slot={undefined}
                    drivers={drivers}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {result?.dotd && (
        <p className="text-sm text-ink-dim">
          Driver of the Day:{" "}
          <span className="font-medium text-ink">{shortName(result.dotd)}</span>
          {myPrediction?.dotd === result.dotd && (
            <span className="ml-2 text-emerald-400">you called it, +5</span>
          )}
        </p>
      )}

      {/* ── Everyone's race ── */}
      {scores.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
            THE FIELD
          </h2>
          <ol className="flex flex-col gap-1.5">
            {scores.map((s, i) => {
              const p = profiles.get(s.user_id);
              return (
                <li
                  key={s.user_id}
                  className={`flex items-center gap-3 rounded-xl border border-line bg-glass px-4 py-2.5 text-sm ${
                    user && s.user_id === user.id ? "border-line-hi" : ""
                  }`}
                >
                  <span className="w-6 font-mono text-ink-mute">{i + 1}</span>
                  <Link
                    href={`/profile/${p?.username ?? ""}`}
                    className="flex-1 font-medium hover:underline"
                  >
                    {p?.username ?? "player"}
                  </Link>
                  <span
                    className={`font-mono text-xs ${
                      s.beat_model
                        ? "text-emerald-400"
                        : s.drew_model
                          ? "text-amber-300"
                          : "text-race"
                    }`}
                  >
                    {s.beat_model ? "beat the model" : s.drew_model ? "drew" : "lost"}
                  </span>
                  <span className="font-mono">{formatPoints(s.total)}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
