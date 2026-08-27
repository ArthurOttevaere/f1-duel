import Link from "next/link";
import { formatPoints } from "@/lib/format";

export interface SeasonRace {
  id: number;
  round: number;
  name: string;
  circuit: string | null;
}

/** The viewer's own line for a race: points, and whether they took the model down. */
export interface MyRace {
  total: number;
  beat_model: boolean;
  drew_model: boolean;
}

/**
 * The season, one line per Grand Prix.
 *
 * This block has been three things. It was a wrap of identical pills, which at
 * twenty-four rounds read as one undifferentiated heap; then one card per race
 * in a three-column grid, which was a real improvement and still the site's
 * fourth grid of equal cards. It is a table now, because that is the shape a
 * season takes everywhere else in this sport: the round hanging in the margin,
 * the Grand Prix, and the numbers in tabular columns you can run an eye down.
 *
 * Signed out, the two right-hand columns do not exist at all — a table with
 * two empty columns promises data it does not have. The result letter carries
 * the site's own W/D/L tones (§3.2), which is also a small correction: the old
 * card drew a win in race red, the colour that means the model won everywhere
 * else.
 */
export default function SeasonRaces({
  races,
  mine,
}: {
  races: SeasonRace[];
  /** The viewer's scores by race id, or null when signed out. */
  mine: Map<number, MyRace> | null;
}) {
  return (
      <section>
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
          Race by race
        </h2>

        {/* S-2: this was a wrap of identical pills, then one card per race
            in a three-column grid — an improvement, and still the site's
            fourth grid of equal cards. A season is a *table* everywhere
            else in this sport: one line per round, the number hanging in
            the margin, the numbers in tabular columns. Twenty-four lines
            read faster than twenty-four tiles, and the eye can run down a
            column of results, which is the whole reason to look. */}
        <div
          aria-hidden
          className="mt-5 grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] gap-x-4 px-2 pb-2 font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase sm:grid-cols-[2.75rem_minmax(0,1fr)_5rem_3.5rem] sm:gap-x-6"
        >
          <span>Rd</span>
          <span>Grand Prix</span>
          <span className="hidden text-right sm:block">
            {mine ? "Your pts" : ""}
          </span>
          <span className="text-right">{mine ? "Duel" : ""}</span>
        </div>

        <ol className="border-b border-line">
          {races.map((r) => {
            const row = mine?.get(r.id);
            const outcome = row
              ? row.beat_model
                ? { letter: "W", tone: "text-emerald-400" }
                : row.drew_model
                  ? { letter: "D", tone: "text-amber-300" }
                  : { letter: "L", tone: "text-race" }
              : null;
            return (
              <li key={r.id} className="border-t border-line">
                <Link
                  href={`/game/races/${r.round}`}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)_3.5rem] items-center gap-x-4 rounded-control px-2 py-3 transition-colors hover:bg-glass sm:grid-cols-[2.75rem_minmax(0,1fr)_5rem_3.5rem] sm:gap-x-6"
                >
                  <span className="font-mono text-sm text-ink-mute tabular-nums">
                    {String(r.round).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {r.name.replace(" Grand Prix", "")}
                    </span>
                    <span className="hidden truncate font-mono text-[0.7rem] text-ink-mute sm:block">
                      {r.circuit ?? "Grand Prix"}
                    </span>
                  </span>
                  {/* Signed out there is no "your" anything, and two empty
                      columns would be a table promising data it has none
                      of — the row is the race and nothing else. */}
                  {mine && (
                    <>
                      <span className="hidden text-right font-mono text-sm tabular-nums sm:block">
                        {row ? formatPoints(Number(row.total)) : "—"}
                      </span>
                      <span
                        className={`text-right font-mono text-sm font-semibold ${
                          outcome?.tone ?? "text-ink-mute"
                        }`}
                      >
                        {outcome?.letter ?? "—"}
                      </span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
  );
}
