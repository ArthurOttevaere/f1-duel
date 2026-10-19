import Link from "next/link";
import Arrow from "@/components/Arrow";
import SeasonCalendar from "@/components/f1/SeasonCalendar";
import { TimeToggle } from "@/components/f1/SessionTime";
import Unreachable from "@/components/f1/Unreachable";
import WeekendSchedule from "@/components/f1/WeekendSchedule";
import { CURRENT_SEASON } from "@/lib/constants";
import { currentWeekend, getCalendar, getSeasonSummaries, renderNow } from "@/lib/f1/season";
import type { DriverRef, Weekend } from "@/lib/f1/types";

export const metadata = {
  title: `F1 ${CURRENT_SEASON} schedule`,
  description: `Every session of the ${CURRENT_SEASON} Formula 1 season, in your time zone or the circuit's.`,
};

/**
 * Schedule — the section's front page.
 *
 * What a reader opens it for is "when is it on, in my time", so the coming
 * weekend's timetable is the page's subject and its h1 is that Grand Prix —
 * not a word like "Schedule" that the tab above already says. The whole
 * calendar follows as the lighter index.
 */
export default async function SchedulePage() {
  const now = renderNow();

  let calendar: Weekend[];
  try {
    calendar = await getCalendar(CURRENT_SEASON);
  } catch {
    return <Unreachable what="the calendar" />;
  }
  // Winners are a nicety on this page: the calendar stands without them.
  const summaries = await getSeasonSummaries(CURRENT_SEASON).catch(() => []);
  const winners = new Map<number, DriverRef>();
  for (const s of summaries) if (s.winner) winners.set(s.round, s.winner);

  const weekend = currentWeekend(calendar, now);
  const started = weekend && new Date(weekend.sessions[0].start).getTime() <= now;
  const sprints = calendar.filter((w) => w.sprint).length;

  return (
    <>
      {weekend ? (
        <section className="mt-12">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
            Round {weekend.round} of {calendar.length} ·{" "}
            {started ? "This weekend" : "Next up"}
          </p>
          <h1 className="display mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {weekend.name}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-ink-dim">
            {weekend.circuit} · {weekend.locality}, {weekend.country}
          </p>

          <div className="mt-8">
            <TimeToggle zone={weekend.timeZone} place={weekend.locality} />
          </div>
          <div className="mt-4">
            <WeekendSchedule
              weekend={weekend}
              now={now}
              resultsHref={(kind) => `/f1/${weekend.round}#${kind}`}
            />
          </div>
          <Link
            href={`/f1/${weekend.round}`}
            className="group mt-5 inline-flex items-center gap-2 text-sm font-semibold text-race"
          >
            <span className="group-hover:underline">The full weekend</span>
            <Arrow />
          </Link>
        </section>
      ) : (
        <section className="mt-12">
          <h1 className="display text-4xl font-extrabold tracking-tight sm:text-5xl">
            The {CURRENT_SEASON} season is run
          </h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink-dim">
            All {calendar.length} rounds are in the book. The final table is on{" "}
            <Link href="/f1/championship" className="text-ink underline-offset-2 hover:underline">
              Championship
            </Link>
            .
          </p>
          <div className="mt-8">
            <TimeToggle zone={null} place="Track" />
          </div>
        </section>
      )}

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
          The season
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mute">
          {`${calendar.length} Grands Prix, ${sprints} of them with a sprint.`}{" "}
          A run round shows its winner; the rest show when the Grand Prix
          starts. Open one for its timetable and every session&apos;s result.
        </p>
        <SeasonCalendar
          calendar={calendar}
          winners={winners}
          current={weekend?.round ?? null}
        />
      </section>
    </>
  );
}
