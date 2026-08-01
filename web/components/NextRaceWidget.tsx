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
    <Link
      href="/game"
      aria-label={`Next race: ${race.name}. Play F1 Duel.`}
      className="rise-in pressable glass-chip flex max-w-[90vw] flex-col items-center gap-3 rounded-2xl px-6 py-3 text-center transition-colors hover:border-line-hi sm:flex-row sm:gap-8 sm:px-8 sm:py-3.5 sm:text-left"
    >
      <div>
        <p className="font-mono text-[0.6rem] tracking-[0.2em] text-race uppercase">
          Next race · Round {race.round}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline justify-center gap-x-2 sm:justify-start">
          <span className="text-base font-semibold sm:text-lg">{race.name}</span>
          {place && (
            <span className="text-sm text-ink-dim">
              <span aria-hidden className="mr-2 text-ink-mute">
                ·
              </span>
              {place}
            </span>
          )}
        </p>
      </div>

      {/* Hairline divider, horizontal when the card stacks on mobile. */}
      <span aria-hidden className="h-px w-12 bg-line sm:h-10 sm:w-px" />

      <NextRaceCountdown to={race.race_at} />
    </Link>
  );
}
