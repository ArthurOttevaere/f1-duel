import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints, formatRaceDate, formatRaceTime } from "@/lib/format";
import type { Driver, ModelEntry, Race, Score } from "@/lib/types";
import Countdown from "@/components/Countdown";
import PredictionEditor from "@/components/PredictionEditor";

export const metadata = { title: "This weekend" };
export const revalidate = 60;

export default async function GamePage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: nextRaces } = await supabase
    .from("races")
    .select("*")
    .eq("season", CURRENT_SEASON)
    .eq("status", "scheduled")
    .gt("race_at", nowIso)
    .order("race_at", { ascending: true })
    .limit(1);
  const race = (nextRaces?.[0] as Race | undefined) ?? null;

  if (!race) {
    return (
      <div className="glass-card mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-bold">No upcoming race</h1>
        <p className="mt-2 text-sm text-ink-dim">
          The season is over (or the calendar hasn&apos;t been synced yet).
          Check the{" "}
          <Link href="/game/standings" className="text-race underline">
            final standings
          </Link>
          .
        </p>
      </div>
    );
  }

  const [
    { data: roster },
    { data: entry },
    predictionRes,
    lastScoredRes,
    seasonPickRes,
  ] = await Promise.all([
    supabase
      .from("drivers")
      .select("*")
      .eq("season", race.season)
      .eq("active", true)
      .order("team"),
    supabase
      .from("model_entries")
      .select("race_id, pre_quali, locked_at")
      .eq("race_id", race.id)
      .maybeSingle(),
    user
      ? supabase
          .from("predictions")
          .select("picks, dotd, sc_bet")
          .eq("race_id", race.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("races")
      .select("*")
      .eq("season", CURRENT_SEASON)
      .eq("status", "scored")
      .order("round", { ascending: false })
      .limit(1),
    user
      ? supabase
          .from("season_picks")
          .select("season")
          .eq("user_id", user.id)
          .eq("season", CURRENT_SEASON)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const prediction = predictionRes.data as {
    picks: string[];
    dotd: string | null;
    sc_bet: boolean | null;
  } | null;
  const lastScored = (lastScoredRes.data?.[0] as Race | undefined) ?? null;

  let lastDuel: { race: Race; score: Score | null; model: number | null } | null =
    null;
  if (lastScored) {
    const [scoreRes, modelRes] = await Promise.all([
      user
        ? supabase
            .from("scores")
            .select("*")
            .eq("race_id", lastScored.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("model_entries")
        .select("total")
        .eq("race_id", lastScored.id)
        .maybeSingle(),
    ]);
    lastDuel = {
      race: lastScored,
      score: (scoreRes.data as Score | null) ?? null,
      model: (modelRes.data as Pick<ModelEntry, "total"> | null)?.total ?? null,
    };
  }

  const raceOpen = new Date(race.race_at ?? 0).getTime() > Date.now();
  const needsPicks = Boolean(user) && !seasonPickRes.data;

  return (
    <div className="flex flex-col gap-6">
      {needsPicks && (
        <Link
          href="/game/picks"
          className="pressable glass-chip flex items-center justify-between rounded-2xl border-race/30 px-5 py-3 text-sm transition-colors hover:border-race/60"
        >
          <span>
            🏆 Call your {CURRENT_SEASON} world champions — one shot, big
            season-end bonus
          </span>
          <span className="font-semibold text-race">Make your picks →</span>
        </Link>
      )}
      {/* ── Race header ── */}
      <section className="glass-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
            Round {race.round} · {race.country}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {race.name}
          </h1>
          <p className="mt-1 text-sm text-ink-dim">
            {race.circuit} · {formatRaceDate(race.race_at)} ·{" "}
            {formatRaceTime(race.race_at)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {race.race_at && (
            <Countdown to={race.race_at} label="Predictions lock in" />
          )}
          <p
            className={`glass-chip rounded-full px-3 py-1 text-xs ${
              entry ? "text-ink-dim" : "text-ink-mute"
            }`}
          >
            {entry
              ? `Model entry is in ${entry.pre_quali ? "(pre-quali)" : "(post-quali)"}`
              : "Model enters after qualifying"}
          </p>
        </div>
      </section>

      {/* ── Last duel result ── */}
      {lastDuel && (
        <Link
          href={`/game/races/${lastDuel.race.round}`}
          className="pressable glass-chip flex items-center justify-between rounded-2xl px-5 py-3 text-sm transition-colors hover:border-line-hi"
        >
          <span className="text-ink-dim">
            Last duel · {lastDuel.race.name}
          </span>
          {lastDuel.score ? (
            <span className="font-mono">
              You {formatPoints(lastDuel.score.total)} —{" "}
              {formatPoints(lastDuel.model ?? 0)} Model{" "}
              <span
                className={
                  lastDuel.score.beat_model
                    ? "ml-2 text-emerald-400"
                    : lastDuel.score.drew_model
                      ? "ml-2 text-amber-300"
                      : "ml-2 text-race"
                }
              >
                {lastDuel.score.beat_model
                  ? "W"
                  : lastDuel.score.drew_model
                    ? "D"
                    : "L"}
              </span>
            </span>
          ) : (
            <span className="text-ink-mute">See the breakdown →</span>
          )}
        </Link>
      )}

      {/* ── Editor ── */}
      <section className="glass-card p-6">
        <PredictionEditor
          race={race}
          roster={(roster as Driver[]) ?? []}
          initialPicks={prediction?.picks ?? []}
          initialDotd={prediction?.dotd ?? null}
          initialScBet={prediction?.sc_bet ?? null}
          canPlay={Boolean(user) && raceOpen}
          signedIn={Boolean(user)}
        />
      </section>

      <p className="text-xs leading-relaxed text-ink-mute">
        Scoring: 10 pts exact position (×1.5–×3 the less the model believed in
        it), 5 pts one off, 2 pts anywhere in the top 10. Podium +15, perfect
        top 10 +100, Driver of the Day +5, safety-car bet +8. Beat the model:
        +10.{" "}
        <Link href="/rules" className="underline">
          Full rules →
        </Link>
      </p>
    </div>
  );
}
