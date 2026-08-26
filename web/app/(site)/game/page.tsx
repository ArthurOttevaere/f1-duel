import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
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

  const user = await getUser();

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
        <h1 className="display text-xl font-extrabold tracking-tight">No upcoming race</h1>
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
    // The view, not the table: since migration 0009 the model's entry for a
    // race that is still open is unreadable through the anon key — picks,
    // matrix and safety-car bet alike. `model_entry_status` publishes the part
    // that was never secret, which is whether it has filed and in which mode.
    supabase
      .from("model_entry_status")
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
  // The order the model played *last* time out — what a signed-out visitor
  // sees behind the sign-in veil (see `previewOrder` below). Safe to read here
  // and nowhere else on this page: that race is over.
  let lastModelOrder: string[] | null = null;
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
        .select(user ? "total" : "total, predicted_order")
        .eq("race_id", lastScored.id)
        .maybeSingle(),
    ]);
    const model = modelRes.data as Pick<
      ModelEntry,
      "total" | "predicted_order"
    > | null;
    lastDuel = {
      race: lastScored,
      score: (scoreRes.data as Score | null) ?? null,
      model: model?.total ?? null,
    };
    lastModelOrder = model?.predicted_order ?? null;
  }

  // eslint-disable-next-line react-hooks/purity -- server render: "now" is the request time
  const raceOpen = new Date(race.race_at ?? 0).getTime() > Date.now();
  const needsPicks = Boolean(user) && !seasonPickRes.data;

  // What a signed-out visitor sees behind the sign-in veil. The editor used to
  // be veiled over an *empty* form, so the one screen where the game actually
  // happens showed a grey rectangle to everyone who had not signed up yet.
  //
  // It is the **last scored race's** model order, never this weekend's, and
  // that restriction is the whole design: this page deliberately never reads
  // `predicted_order` for the upcoming race, because that would hand the
  // model's picks to anyone who signs out before the lock. A finished race
  // gives the same "here is what a real entry looks like" for free.
  // Drivers who have since left the grid are dropped rather than left as holes
  // in the preview: the roster read here is the *active* one.
  const activeIds = new Set(
    ((roster as Driver[]) ?? []).map((d) => d.driver_id),
  );
  const previewEntry =
    !user && lastModelOrder && lastScored
      ? {
          order: lastModelOrder.filter((id) => activeIds.has(id)).slice(0, 10),
          raceName: lastScored.name,
        }
      : null;

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
          <h1 className="display mt-1 text-2xl font-extrabold tracking-tight">
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
          // Gap and shrink-0, both load-bearing: `justify-between` alone let
          // the race name wrap under a call-to-action it was already touching,
          // and "Hungarian Grand" ran straight into "See the breakdown".
          className="pressable glass-chip flex flex-col items-start gap-1 rounded-2xl px-5 py-3 text-sm transition-colors hover:border-line-hi sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <span className="text-ink-dim">
            Last duel · {lastDuel.race.name}
          </span>
          {lastDuel.score ? (
            <span className="shrink-0 font-mono">
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
            <span className="shrink-0 text-ink-mute">See the breakdown →</span>
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
          previewEntry={previewEntry}
        />
      </section>

      <p className="text-xs leading-relaxed text-ink-mute">
        Scoring: 10 pts exact position (×1.5–×3 the less the model believed in
        it), 5 pts one off, 2 pts anywhere in the top 10. Podium +15, perfect
        top 10 +100, Driver of the Day +5, safety-car bet +8. Outscore the model
        and you win the Grand Prix — that&apos;s what the season table counts.{" "}
        <Link href="/rules" className="underline">
          Full rules →
        </Link>
      </p>
    </div>
  );
}
