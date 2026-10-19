import type { ConstructorStanding, DriverStanding } from "@/lib/f1/types";
import DriverMark from "./DriverMark";

/**
 * The two championship tables, as towers (DESIGN §7.5.1).
 *
 * Drivers is the page's table; constructors gives up a weight class beside it
 * (§7.5) — shorter rows, a step down in type — because two towers of equal
 * weight read as one list.
 *
 * The drivers' table carries the title fight's verdict on every row: the ones
 * who can still be champion in full ink, then a labelled rule, then everyone
 * the arithmetic has shut out, dimmed. Contention follows the points order, so
 * the rule falls in exactly one place.
 */

function rankTone(position: number): string {
  if (position === 1) return "text-ink";
  if (position <= 3) return "text-ink-dim";
  return "text-ink-mute";
}

const DRIVER_COLS =
  "grid-cols-[1.75rem_minmax(0,1fr)_2.5rem_3rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_3rem_3.5rem] sm:gap-x-5";

export function DriversTable({
  rows,
  inContention,
}: {
  rows: DriverStanding[];
  /** Driver ids still able to win the title; null once the season is over. */
  inContention: Set<string> | null;
}) {
  const leader = rows[0]?.points ?? 0;
  return (
    <div>
      <div
        aria-hidden
        className={`grid ${DRIVER_COLS} gap-x-3 px-2 pb-2 font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase`}
      >
        <span>Pos</span>
        <span>Driver</span>
        <span className="text-right">Wins</span>
        <span className="text-right">Pts</span>
      </div>
      <ol className="border-b border-line">
        {rows.map((r, i) => {
          const out = inContention !== null && !inContention.has(r.driver.id);
          const firstOut =
            out && (i === 0 || inContention?.has(rows[i - 1].driver.id));
          return (
            <li key={r.driver.id} className="border-t border-line">
              {firstOut && (
                <p className="px-2 pt-3 pb-1 font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase">
                  Can no longer win the title
                </p>
              )}
              <div
                className={`grid ${DRIVER_COLS} items-center gap-x-3 px-2 py-2.5 ${out ? "opacity-55" : ""}`}
              >
                <span className={`font-mono text-sm tabular-nums ${rankTone(r.position)}`}>
                  {r.position}
                </span>
                <span className="min-w-0">
                  <DriverMark driver={r.driver} full className="text-sm font-medium" />
                  <span className="mt-0.5 block truncate pl-2.5 font-mono text-[0.65rem] text-ink-mute">
                    {r.driver.team}
                    {i > 0 && <span> · −{leader - r.points}</span>}
                  </span>
                </span>
                <span className="text-right font-mono text-xs text-ink-dim tabular-nums">
                  {r.wins || "–"}
                </span>
                <span className="text-right font-mono text-sm tabular-nums sm:text-base">
                  {r.points}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const TEAM_COLS = "grid-cols-[1.75rem_minmax(0,1fr)_2.5rem_3rem] sm:gap-x-4";

export function ConstructorsTable({ rows }: { rows: ConstructorStanding[] }) {
  return (
    <div>
      <div
        aria-hidden
        className={`grid ${TEAM_COLS} gap-x-3 px-2 pb-2 font-mono text-[0.55rem] tracking-wider text-ink-mute uppercase`}
      >
        <span>Pos</span>
        <span>Team</span>
        <span className="text-right">Wins</span>
        <span className="text-right">Pts</span>
      </div>
      <ol className="border-b border-line/60">
        {rows.map((r) => (
          <li
            key={r.team}
            className={`grid ${TEAM_COLS} items-center gap-x-3 border-t border-line/60 px-2 py-2`}
          >
            <span className={`font-mono text-xs tabular-nums ${rankTone(r.position)}`}>
              {r.position}
            </span>
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span aria-hidden className="h-3.5 w-0.5 shrink-0" style={{ background: r.color }} />
              <span className="truncate">{r.team}</span>
            </span>
            <span className="text-right font-mono text-xs text-ink-mute tabular-nums">
              {r.wins || "–"}
            </span>
            <span className="text-right font-mono text-sm tabular-nums">{r.points}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
