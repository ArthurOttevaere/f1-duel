import Link from "next/link";
import Arrow from "@/components/Arrow";
import Chevron from "@/components/f1/Chevron";
import DriverMark from "@/components/f1/DriverMark";
import Unreachable from "@/components/f1/Unreachable";
import { CURRENT_SEASON } from "@/lib/constants";
import { shortGp } from "@/lib/f1/format";
import {
  currentWeekend,
  getCalendar,
  getSeasonSummaries,
  getWeekendResults,
  lastWeekend,
  type SessionOutcome,
  renderNow,
} from "@/lib/f1/season";
import type { DriverRef, Weekend, WeekendSummary } from "@/lib/f1/types";

export const metadata = {
  title: `F1 ${CURRENT_SEASON} results`,
  description: `Every session of the ${CURRENT_SEASON} Formula 1 season as classified — practice, qualifying, sprints and Grands Prix.`,
};

/** The top three of any session, whatever its shape. */
function podium(outcome: SessionOutcome | undefined): DriverRef[] | null {
  if (!outcome || typeof outcome !== "object") return null;
  return outcome.rows
    .filter((r) => !("positionText" in r) || /^\d+$/.test(r.positionText))
    .slice(0, 3)
    .map((r) => r.driver);
}

const LATEST_COLS =
  "grid-cols-[minmax(0,1fr)_0.75rem] sm:grid-cols-[8.5rem_repeat(3,minmax(0,1fr))_1rem]";
const SEASON_COLS =
  "grid-cols-[1.75rem_minmax(0,1fr)_6.5rem_0.75rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_8.5rem_8.5rem_8.5rem_1rem]";

/**
 * Results — the overview.
 *
 * Two lists, and the second gives up a weight class (DESIGN §7.5). The first
 * is the latest weekend, every session of it down to its podium — what a
 * reader who missed Friday wants in one look. The second is the season,
 * a line per round: pole, sprint, Grand Prix. Practice is not on it: its
 * source (OpenF1) allows thirty calls a minute, and twenty rounds of three
 * sessions is a page that could not load. Each weekend's page has them all.
 */
export default async function ResultsPage() {
  const now = renderNow();

  let calendar: Weekend[];
  let summaries: WeekendSummary[];
  try {
    [calendar, summaries] = await Promise.all([
      getCalendar(CURRENT_SEASON),
      getSeasonSummaries(CURRENT_SEASON),
    ]);
  } catch {
    return <Unreachable what="the results" />;
  }

  // The weekend under way if anything of it has run, else the last one.
  const live = currentWeekend(calendar, now);
  const latest =
    live && new Date(live.sessions[0].start).getTime() <= now
      ? live
      : lastWeekend(calendar, now);
  const latestData = latest
    ? await getWeekendResults(CURRENT_SEASON, latest.round, now)
    : null;
  const byRound = new Map(calendar.map((w) => [w.round, w]));

  return (
    <>
      <section className="mt-12">
        <h1 className="display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Results
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-dim">
          Every session of the {CURRENT_SEASON} season as it was classified.
          The official points — nothing here comes from the game.
        </p>
      </section>

      {latest && latestData ? (
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
              Latest · Round {latest.round} · {latest.name}
            </h2>
            <Link
              href={`/f1/${latest.round}`}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-race"
            >
              <span className="group-hover:underline">Full classifications</span>
              <Arrow />
            </Link>
          </div>

          <div
            aria-hidden
            className={`mt-6 hidden ${LATEST_COLS} gap-x-5 px-2 pb-2 font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase sm:grid`}
          >
            <span>Session</span>
            <span>P1</span>
            <span>P2</span>
            <span>P3</span>
            <span />
          </div>
          <ol className="mt-4 border-b border-line sm:mt-0">
            {latest.sessions
              .filter((s) => latestData.outcomes[s.kind] !== undefined)
              .map((s) => {
                const top = podium(latestData.outcomes[s.kind]);
                return (
                  <li key={s.kind} className="border-t border-line">
                    <Link
                      href={`/f1/${latest.round}#${s.kind}`}
                      className={`group grid ${LATEST_COLS} items-center gap-x-5 rounded-control px-2 py-3 transition-colors hover:bg-glass`}
                    >
                      <span className="min-w-0">
                        <span
                          className={`block text-sm sm:font-mono sm:text-[0.7rem] sm:tracking-wider sm:uppercase ${
                            s.kind === "race" ? "font-semibold text-ink" : "text-ink-dim"
                          }`}
                        >
                          {s.name}
                        </span>
                        {/* On a phone the podium rides under the session. */}
                        <span className="mt-1 block text-xs text-ink-mute sm:hidden">
                          {top
                            ? top.map((d, i) => `${i + 1}. ${d.lastName}`).join("  ·  ")
                            : "Not published yet"}
                        </span>
                      </span>
                      {top ? (
                        top.map((d, i) => (
                          <DriverMark
                            key={d.id}
                            driver={d}
                            className={`hidden text-sm sm:flex ${i === 0 ? "text-ink" : "text-ink-dim"}`}
                          />
                        ))
                      ) : (
                        <span className="hidden text-xs text-ink-mute sm:col-span-3 sm:block">
                          Not published yet
                        </span>
                      )}
                      <Chevron />
                    </Link>
                  </li>
                );
              })}
          </ol>
        </section>
      ) : (
        <p className="mt-10 rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute">
          No session has run yet this season. Results appear here once
          Practice 1 of round 1 is over.
        </p>
      )}

      {summaries.length > 0 && (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
            The season
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mute">
            Pole, sprint and Grand Prix winner, round by round. Open a round
            for every session, practice included.
          </p>

          <div
            aria-hidden
            className={`mt-6 grid ${SEASON_COLS} gap-x-3 px-2 pb-1.5 font-mono text-[0.55rem] tracking-wider text-ink-mute uppercase sm:gap-x-5`}
          >
            <span>Rd</span>
            <span>Grand Prix</span>
            <span className="hidden sm:block">Pole</span>
            <span className="hidden sm:block">Sprint</span>
            <span className="text-right sm:text-left">Winner</span>
            <span />
          </div>
          <ol className="border-b border-line/60">
            {summaries.map((s) => {
              const w = byRound.get(s.round);
              return (
                <li key={s.round} className="border-t border-line/60">
                  <Link
                    href={`/f1/${s.round}`}
                    className={`group grid ${SEASON_COLS} items-center gap-x-3 rounded-control px-2 py-2.5 transition-colors hover:bg-glass sm:gap-x-5`}
                  >
                    <span className="font-mono text-xs text-ink-mute tabular-nums">
                      {String(s.round).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {w ? shortGp(w.name) : `Round ${s.round}`}
                      </span>
                      {/* Phone: pole and sprint under the name, wrapping
                          rather than truncating — a cut-off "Sprint Ru…" is
                          a name nobody can read. */}
                      <span className="flex flex-wrap gap-x-2 font-mono text-[0.65rem] text-ink-mute sm:hidden">
                        {s.pole && <span>Pole {s.pole.lastName}</span>}
                        {s.sprintWinner && <span>Sprint {s.sprintWinner.lastName}</span>}
                      </span>
                    </span>
                    <span className="hidden text-xs text-ink-dim sm:block">
                      {s.pole ? <DriverMark driver={s.pole} /> : "–"}
                    </span>
                    <span className="hidden text-xs text-ink-dim sm:block">
                      {s.sprintWinner ? (
                        <DriverMark driver={s.sprintWinner} />
                      ) : (
                        <span className="text-ink-mute">–</span>
                      )}
                    </span>
                    <span className="min-w-0 justify-self-end text-xs sm:justify-self-stretch">
                      {s.winner ? (
                        <DriverMark driver={s.winner} className="text-ink" />
                      ) : (
                        <span className="font-mono text-ink-mute">Pending</span>
                      )}
                    </span>
                    <Chevron />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </>
  );
}
