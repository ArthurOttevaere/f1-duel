import type { Classification, PracticeRow, QualiRow, RaceRow } from "@/lib/f1/types";
import { lapTime } from "@/lib/f1/format";
import DriverMark from "./DriverMark";

/**
 * One session's classification, as the timing tower draws a running order
 * (DESIGN §7.5.1): one `<ol>` at every width, the position hanging in the
 * margin, hairlines between rows, numbers in tabular mono columns. Columns
 * that need the width — team, laps, the three qualifying times — appear from
 * `sm` up; on a phone the row keeps what answers "who, and by how much".
 *
 * Three shapes, because the three kinds of session are measured differently:
 * a race by time and points, a qualifying by its knock-out rounds, practice by
 * its best lap.
 */

/** Ergast's non-numeric positions, as a timing screen prints them. */
const OUT: Record<string, string> = {
  R: "DNF",
  D: "DSQ",
  E: "EXC",
  W: "DNS",
  F: "DNQ",
  N: "NC",
};

function rankTone(position: number): string {
  if (position === 1) return "text-ink";
  if (position <= 3) return "text-ink-dim";
  return "text-ink-mute";
}

function Head({ cols, children }: { cols: string; children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className={`grid ${cols} gap-x-3 px-2 pb-2 font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase sm:gap-x-5`}
    >
      {children}
    </div>
  );
}

const RACE_COLS =
  "grid-cols-[2.25rem_minmax(0,1fr)_5.5rem_2rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_9rem_3rem_7rem_3rem]";

function RaceTable({ rows }: { rows: RaceRow[] }) {
  return (
    <>
      <Head cols={RACE_COLS}>
        <span>Pos</span>
        <span>Driver</span>
        <span className="hidden sm:block">Team</span>
        <span className="hidden text-right sm:block">Laps</span>
        <span className="text-right">Time</span>
        <span className="text-right">Pts</span>
      </Head>
      <ol className="border-b border-line">
        {rows.map((r) => {
          const out = OUT[r.positionText];
          return (
            <li
              key={r.driver.id}
              className={`grid ${RACE_COLS} items-center gap-x-3 border-t border-line px-2 py-2.5 sm:gap-x-5`}
            >
              <span
                className={`font-mono text-sm tabular-nums ${out ? "text-[0.7rem] text-ink-mute" : rankTone(r.position)}`}
              >
                {out ?? r.position}
              </span>
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <DriverMark driver={r.driver} full />
                {r.fastestLap && (
                  <span
                    title="Fastest lap"
                    className="shrink-0 font-mono text-[0.55rem] tracking-wider text-ink-dim uppercase"
                  >
                    FL<span className="sr-only"> — fastest lap</span>
                  </span>
                )}
              </span>
              <span className="hidden truncate text-xs text-ink-mute sm:block">
                {r.driver.team}
              </span>
              <span className="hidden text-right font-mono text-xs text-ink-mute tabular-nums sm:block">
                {r.laps}
              </span>
              {/* The winner's time, everyone else's gap — and where there is
                  neither, the reason: "+1 Lap", "Retired", "Collision". */}
              <span
                className={`truncate text-right font-mono text-xs tabular-nums ${
                  r.time ? "text-ink-dim" : "text-ink-mute"
                }`}
              >
                {r.time ?? r.status}
              </span>
              <span
                className={`text-right font-mono text-sm tabular-nums ${
                  r.points > 0 ? "text-ink" : "text-ink-mute"
                }`}
              >
                {r.points > 0 ? r.points : "–"}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

const QUALI_COLS =
  "grid-cols-[2.25rem_minmax(0,1fr)_5rem_1.75rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_9rem_5.5rem_5.5rem_5.5rem]";

function QualiTable({ rows, sprint }: { rows: QualiRow[]; sprint: boolean }) {
  const q = sprint ? "SQ" : "Q";
  return (
    <>
      <Head cols={QUALI_COLS}>
        <span>Pos</span>
        <span>Driver</span>
        <span className="hidden sm:block">Team</span>
        <span className="hidden text-right sm:block">{q}1</span>
        <span className="hidden text-right sm:block">{q}2</span>
        <span className="hidden text-right sm:block">{q}3</span>
        {/* Phone: the best time and the round it was set in. */}
        <span className="text-right sm:hidden">Best</span>
        <span className="sm:hidden" />
      </Head>
      <ol className="border-b border-line">
        {rows.map((r) => {
          const best = r.q3 ? [r.q3, 3] : r.q2 ? [r.q2, 2] : r.q1 ? [r.q1, 1] : null;
          return (
            <li
              key={r.driver.id}
              className={`grid ${QUALI_COLS} items-center gap-x-3 border-t border-line px-2 py-2.5 sm:gap-x-5`}
            >
              <span className={`font-mono text-sm tabular-nums ${rankTone(r.position)}`}>
                {r.position}
              </span>
              <DriverMark driver={r.driver} full className="text-sm" />
              <span className="hidden truncate text-xs text-ink-mute sm:block">
                {r.driver.team}
              </span>
              {[r.q1, r.q2, r.q3].map((t, i) => (
                <span
                  key={i}
                  className={`hidden text-right font-mono text-xs tabular-nums sm:block ${
                    t ? (i === 2 ? "text-ink" : "text-ink-dim") : "text-ink-mute"
                  }`}
                >
                  {t ?? "–"}
                </span>
              ))}
              <span className="text-right font-mono text-xs text-ink-dim tabular-nums sm:hidden">
                {best?.[0] ?? "No time"}
              </span>
              <span className="font-mono text-[0.6rem] text-ink-mute sm:hidden">
                {best ? `${q}${best[1]}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

const PRACTICE_COLS =
  "grid-cols-[2.25rem_minmax(0,1fr)_4.75rem_3.75rem] sm:grid-cols-[2.5rem_minmax(0,1fr)_9rem_6rem_5rem_3rem]";

function PracticeTable({ rows }: { rows: PracticeRow[] }) {
  return (
    <>
      <Head cols={PRACTICE_COLS}>
        <span>Pos</span>
        <span>Driver</span>
        <span className="hidden sm:block">Team</span>
        <span className="text-right">Best lap</span>
        <span className="text-right">Gap</span>
        <span className="hidden text-right sm:block">Laps</span>
      </Head>
      <ol className="border-b border-line">
        {rows.map((r) => (
          <li
            key={r.driver.id}
            className={`grid ${PRACTICE_COLS} items-center gap-x-3 border-t border-line px-2 py-2.5 sm:gap-x-5`}
          >
            <span className={`font-mono text-sm tabular-nums ${rankTone(r.position)}`}>
              {r.position}
            </span>
            <DriverMark driver={r.driver} full className="text-sm" />
            <span className="hidden truncate text-xs text-ink-mute sm:block">
              {r.driver.team}
            </span>
            <span
              className={`text-right font-mono text-xs tabular-nums ${
                r.best ? "text-ink-dim" : "text-ink-mute"
              }`}
            >
              {lapTime(r.best) ?? "No time"}
            </span>
            <span className="text-right font-mono text-xs text-ink-mute tabular-nums">
              {r.gap === null || !r.best ? "" : r.gap === 0 ? "—" : `+${r.gap.toFixed(3)}`}
            </span>
            <span className="hidden text-right font-mono text-xs text-ink-mute tabular-nums sm:block">
              {r.laps}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

export default function ClassificationTable({ c }: { c: Classification }) {
  switch (c.kind) {
    case "race":
    case "sprint":
      return <RaceTable rows={c.rows} />;
    case "quali":
    case "sprint_quali":
      return <QualiTable rows={c.rows} sprint={c.kind === "sprint_quali"} />;
    default:
      return <PracticeTable rows={c.rows} />;
  }
}
