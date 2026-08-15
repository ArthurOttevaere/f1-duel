import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import NextRaceCountdown from "@/components/NextRaceCountdown";

/**
 * The hero's next-race widget: which Grand Prix is next, where, and how long
 * until lights out.
 *
 * The name and place are rendered on the server — they are the point of the
 * thing, and they should be in the HTML whether or not the clock ever starts.
 * Only the digits are client-side.
 */
export default async function NextRaceWidget() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("races")
    .select("round, name, circuit, country, race_at")
    .eq("season", CURRENT_SEASON)
    .not("race_at", "is", null)
    .gte("race_at", new Date().toISOString())
    .order("race_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const race = data as {
    round: number;
    name: string;
    circuit: string | null;
    country: string | null;
    race_at: string;
  } | null;

  // Between seasons, before the calendar is synced, or if the query fails:
  // fall back to the line this widget replaced rather than an empty box.
  if (!race) {
    return (
      <p className="rise-in glass-chip max-w-[90vw] rounded-full px-4 py-1.5 font-mono text-[0.65rem] tracking-[0.15em] text-ink-dim uppercase sm:text-xs sm:tracking-[0.2em]">
        {CURRENT_SEASON} season · one duel per Grand Prix
      </p>
    );
  }

  // Comma, not a bullet: the place sits on the same line as the race name now,
  // already separated from it by one — three bullets in a row read as noise.
  const place = [race.circuit, race.country].filter(Boolean).join(", ");

  return (
    // Wide and shallow on purpose: it sits directly above the hero headline,
    // so it earns its place by being a strip rather than a block. The name and
    // the place share one line — three stacked lines made it as tall as it was
    // wide and it started competing with "Beat the model."
    //
    // On a phone it stays a single row rather than stacking: stacked, the
    // label, the name and a four-column clock ate a third of the viewport
    // before the headline got a word in. Two lines of small type is enough.
    <Link
      href="/game"
      aria-label={`Next race: ${race.name}. Play F1 Duel.`}
      className="rise-in pressable glass-chip flex max-w-[90vw] items-center gap-3 rounded-xl px-3.5 py-2 text-left transition-colors hover:border-line-hi sm:gap-8 sm:rounded-2xl sm:px-8 sm:py-3.5"
    >
      {/* min-w-0 so a long circuit name truncates instead of squeezing the
          clock off the side of a narrow phone. */}
      <div className="min-w-0">
        <p className="font-mono text-[0.55rem] tracking-[0.2em] text-race uppercase sm:text-[0.6rem]">
          Next race · Round {race.round}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span className="truncate text-sm font-semibold sm:text-lg">
            {race.name}
          </span>
          {place && (
            // The place is the first thing to go on a phone: the name already
            // names the country in most cases.
            <span className="hidden text-sm text-ink-dim sm:inline">
              <span aria-hidden className="mr-2 text-ink-mute">
                ·
              </span>
              {place}
            </span>
          )}
        </p>
      </div>

      <span aria-hidden className="h-7 w-px shrink-0 bg-line sm:h-10" />

      <div className="shrink-0">
        <NextRaceCountdown to={race.race_at} />
      </div>
    </Link>
  );
}
