import CircuitTrace from "@/components/CircuitTrace";
import NextRaceCountdown from "@/components/NextRaceCountdown";
import type { CircuitTrace as Trace } from "@/lib/circuits";
import type { NextRace } from "@/lib/nextRace";

/**
 * The hero's right-hand column: the next Grand Prix as one block of fact.
 *
 * The circuit, a rule, then what it is — name, venue, round, corner count —
 * and how long until lights out. It replaced a glass chip that floated above
 * the headline carrying the same information in a box, which was a box doing
 * an eyebrow's job (DESIGN.md §4.4) and pushed the headline a third of the way
 * down the hero.
 *
 * It is not a link. Two labelled buttons sit a few centimetres away; a third
 * unsignposted click target to the same place is noise, and a block of data
 * that lights up under the cursor reads as a button somebody forgot to
 * finish.
 *
 * The clock is `hidden lg:flex`: below `lg` this whole block sits under the
 * buttons, so the phone gets the countdown in the line above the headline
 * instead (`NextRaceLine`). One number, two places, never both at once.
 */
export default function HeroRaceCard({
  trace,
  race,
  className = "",
}: {
  trace: Trace;
  race: NextRace;
  className?: string;
}) {
  const meta = [trace.location, `Round ${race.round}`, `${trace.corners} corners`]
    .join(" · ")
    .toUpperCase();

  return (
    <figure className={className}>
      {/* Interactive here and only here: this is the one place the circuit is
          drawn at a size a mouse can aim at, and a phone has no pointer to
          follow. See DESIGN.md §6.3.2. */}
      <CircuitTrace trace={trace} interactive />

      <figcaption className="mt-6 border-t border-line pt-4">
        <p className="display text-lg font-extrabold tracking-tight">
          {race.name}
        </p>
        <p className="mt-1 font-mono text-[0.6rem] tracking-[0.18em] text-ink-mute uppercase sm:text-[0.65rem]">
          {meta}
        </p>

        <p className="mt-6 hidden font-mono text-[0.6rem] tracking-[0.2em] text-ink-mute uppercase lg:block">
          Lights out in
        </p>
        <NextRaceCountdown
          to={race.race_at}
          variant="tower"
          className="mt-2 hidden lg:flex"
        />
      </figcaption>
    </figure>
  );
}
