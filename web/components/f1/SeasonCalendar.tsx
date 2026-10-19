import Link from "next/link";
import { shortGp } from "@/lib/f1/format";
import type { DriverRef, Weekend } from "@/lib/f1/types";
import DriverMark from "./DriverMark";
import { DateRange, When } from "./SessionTime";
import Chevron from "./Chevron";

/**
 * The whole calendar, a line per round.
 *
 * It sits under the coming weekend's timetable, so it is the list that gives
 * up a weight class (DESIGN §7.5): one line a row, mono a step down, softer
 * rules, and a chevron, because every row is a way into that weekend.
 *
 * The right-hand column is the one a calendar of this sport always has: the
 * winner once a round is run, the start of the Grand Prix before — in the
 * section's clock, like every other time here.
 */
export default function SeasonCalendar({
  calendar,
  winners,
  current,
}: {
  calendar: Weekend[];
  winners: Map<number, DriverRef>;
  /** The round the timetable above is about, lit here too. */
  current: number | null;
}) {
  const cols =
    "grid-cols-[1.75rem_minmax(0,1fr)_5.75rem_0.75rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_7.5rem_9.5rem_1rem]";

  return (
    <>
      <div
        aria-hidden
        className={`mt-6 grid ${cols} gap-x-3 px-2 pb-1.5 font-mono text-[0.55rem] tracking-wider text-ink-mute uppercase sm:gap-x-5`}
      >
        <span>Rd</span>
        <span>Grand Prix</span>
        <span className="hidden sm:block">Dates</span>
        <span className="text-right sm:text-left">Winner · start</span>
        <span />
      </div>
      <ol className="border-b border-line/60">
        {calendar.map((w) => {
          const race = w.sessions.find((s) => s.kind === "race");
          const first = w.sessions[0];
          const winner = winners.get(w.round);
          const isCurrent = w.round === current;
          return (
            <li key={w.round} className="border-t border-line/60">
              <Link
                href={`/f1/${w.round}`}
                aria-current={isCurrent ? "true" : undefined}
                className={`group grid ${cols} items-center gap-x-3 rounded-control px-2 py-2.5 transition-colors hover:bg-glass sm:gap-x-5 ${
                  isCurrent ? "bg-glass" : ""
                }`}
              >
                <span
                  className={`font-mono text-xs tabular-nums ${isCurrent ? "text-race" : "text-ink-mute"}`}
                >
                  {String(w.round).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className={`truncate text-sm ${winner ? "text-ink-dim" : ""}`}>
                      {shortGp(w.name)}
                    </span>
                    {w.sprint && (
                      <span className="shrink-0 font-mono text-[0.55rem] tracking-wider text-ink-mute uppercase">
                        Sprint
                      </span>
                    )}
                  </span>
                  {/* On a phone the dates ride under the name. */}
                  {first && race && (
                    <DateRange
                      from={first.start}
                      to={race.start}
                      zone={w.timeZone}
                      className="block font-mono text-[0.65rem] text-ink-mute sm:hidden"
                    />
                  )}
                </span>
                <span className="hidden font-mono text-xs text-ink-mute sm:block">
                  {first && race && (
                    <DateRange from={first.start} to={race.start} zone={w.timeZone} />
                  )}
                </span>
                <span className="min-w-0 justify-self-end text-right text-xs sm:justify-self-start sm:text-left">
                  {winner ? (
                    <DriverMark driver={winner} className="text-ink-dim" />
                  ) : race && !race.tbc ? (
                    <When
                      iso={race.start}
                      zone={w.timeZone}
                      show="dayTime"
                      className="font-mono text-[0.7rem] text-ink-dim tabular-nums"
                    />
                  ) : (
                    <span className="font-mono text-ink-mute">TBC</span>
                  )}
                </span>
                <Chevron />
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
