import NextRaceCountdown from "@/components/NextRaceCountdown";
import { CURRENT_SEASON } from "@/lib/constants";
import type { NextRace } from "@/lib/nextRace";

/**
 * The one line above the headline.
 *
 * The site's own eyebrow (DESIGN.md §4.4) rather than the glass chip that used
 * to sit here: an uppercase mono line, no box, no border, no hover. The chip
 * was a container drawn around information that the type could carry on its
 * own, and it cost the headline a third of the hero.
 *
 * It is the **phone half** of the countdown when there is a circuit to draw —
 * the race card below the fold owns the clock from `lg` up, so this hides
 * there. With no trace (a new venue, or between seasons) there is no card, so
 * the line stays at every width and carries the clock alone.
 */
export default function NextRaceLine({
  race,
  hasTrace,
  className = "",
}: {
  race: NextRace | null;
  hasTrace: boolean;
  className?: string;
}) {
  const base =
    "font-mono text-[0.6rem] tracking-[0.18em] text-ink-mute uppercase sm:text-xs sm:tracking-[0.2em]";

  if (!race) {
    return (
      <p className={`${base} ${className}`}>
        {CURRENT_SEASON} season · one duel per Grand Prix
      </p>
    );
  }

  return (
    <p className={`${base} ${hasTrace ? "lg:hidden" : ""} ${className}`}>
      Round {race.round} · {race.name} · Lights out in{" "}
      <NextRaceCountdown to={race.race_at} variant="inline" />
    </p>
  );
}
