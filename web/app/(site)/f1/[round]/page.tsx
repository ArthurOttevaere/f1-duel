import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SessionResults, { type SessionEntry } from "@/components/f1/SessionResults";
import { TimeToggle } from "@/components/f1/SessionTime";
import Unreachable from "@/components/f1/Unreachable";
import WeekendSchedule from "@/components/f1/WeekendSchedule";
import { CURRENT_SEASON } from "@/lib/constants";
import { shortGp } from "@/lib/f1/format";
import { getCalendar, getWeekendResults, renderNow } from "@/lib/f1/season";
import type { SessionKind, Weekend } from "@/lib/f1/types";

/** The session switch's labels — short, because seven of them share a row. */
const LABEL: Record<SessionKind, string> = {
  fp1: "FP1",
  fp2: "FP2",
  fp3: "FP3",
  sprint_quali: "Sprint quali",
  sprint: "Sprint",
  quali: "Quali",
  race: "Grand Prix",
};

function parseRound(raw: string): number | null {
  return /^\d{1,2}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ round: string }>;
}): Promise<Metadata> {
  const round = parseRound((await params).round);
  const weekend = round
    ? (await getCalendar(CURRENT_SEASON).catch(() => [] as Weekend[])).find(
        (w) => w.round === round,
      )
    : undefined;
  return weekend
    ? {
        title: `${weekend.name} ${CURRENT_SEASON}`,
        description: `Timetable and every session's classification for round ${weekend.round}, ${weekend.name}.`,
      }
    : {};
}

/**
 * One weekend: its timetable, then each session's classification.
 *
 * The same page before, during and after — the timetable is always there,
 * and the results block grows as sessions run. Not to be confused with
 * `/game/races/<n>`, which is the *game's* page for the same round (the duel,
 * the scores); this one links to nothing in the game.
 */
export default async function WeekendPage({
  params,
}: {
  params: Promise<{ round: string }>;
}) {
  const round = parseRound((await params).round);
  if (round === null) notFound();
  const now = renderNow();

  let calendar: Weekend[];
  try {
    calendar = await getCalendar(CURRENT_SEASON);
  } catch {
    return <Unreachable what="the calendar" />;
  }
  if (!calendar.some((w) => w.round === round)) notFound();

  const data = await getWeekendResults(CURRENT_SEASON, round, now);
  if (!data) notFound();
  const { weekend, outcomes } = data;

  const entries: SessionEntry[] = weekend.sessions
    .filter((s) => outcomes[s.kind] !== undefined)
    .map((s) => ({ kind: s.kind, label: LABEL[s.kind], outcome: outcomes[s.kind]! }));

  const prev = calendar.find((w) => w.round === round - 1);
  const next = calendar.find((w) => w.round === round + 1);

  return (
    <>
      <section className="mt-12">
        <p className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
          Round {weekend.round} of {calendar.length}
          {weekend.sprint ? " · Sprint weekend" : ""}
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
            resultsHref={(kind) =>
              typeof outcomes[kind as SessionKind] === "object" ? `#${kind}` : ""
            }
          />
        </div>
      </section>

      <section className="mt-16 border-t border-line pt-10">
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
          Results
        </h2>
        {entries.length > 0 ? (
          <>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mute">
              As classified — the official points, nothing from F1 Duel.
              Practice and sprint qualifying come from OpenF1, the rest from
              Jolpica.
            </p>
            <div className="mt-6">
              <SessionResults entries={entries} />
            </div>
          </>
        ) : (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-mute">
            Nothing has run yet. Each session&apos;s classification appears here
            after it ends — about half an hour later for practice, a few hours
            for qualifying and the Grand Prix.
          </p>
        )}
      </section>

      {/* Weekend to weekend, in calendar order. The two arrows are
          pagination's, the one place they stay glyphs (DESIGN §7.9). */}
      <nav
        aria-label="Other rounds"
        className="mt-16 flex items-center justify-between gap-4 border-t border-line pt-6 font-mono text-xs"
      >
        {prev ? (
          <Link href={`/f1/${prev.round}`} className="text-ink-dim transition-colors hover:text-ink">
            ← {shortGp(prev.name)}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/f1/${next.round}`} className="text-ink-dim transition-colors hover:text-ink">
            {shortGp(next.name)} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
