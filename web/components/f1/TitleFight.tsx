import { DriverAvatar } from "@/components/DriverChip";
import { RACE_MAX, SPRINT_MAX, type TitleFight as Fight } from "@/lib/f1/titleFight";
import type { DriverStanding } from "@/lib/f1/types";
import { tint } from "@/lib/teams";

/**
 * Who can still be champion, drawn as the rule that decides it (DESIGN §1.1).
 *
 * One bar per driver still in it: the solid part is what they have, the faint
 * part everything they could still add. The vertical line is the leader's
 * total. **A bar that reaches the line is in the fight** — which is the whole
 * definition (`lib/f1/titleFight.ts`), so the picture and the rule are the
 * same thing, and the first driver it has already shut out is drawn under the
 * contenders, dimmed, so the reader can see by how much.
 *
 * Every bar prints its two numbers beside it (§1.2): points now, and the most
 * they can finish on. Bars run from zero — a chart that started at the
 * fifth-placed driver's total would make a 139-point gap look like a rout.
 *
 * The portraits are spent here and not in the tables below: six faces at the
 * top of the page is the fight; twenty-two in a table is a yearbook.
 */

function Row({
  standing,
  max,
  gap,
  scale,
  line,
  out = false,
}: {
  standing: DriverStanding;
  max: number;
  gap: number;
  /** The chart's full width, in points. */
  scale: number;
  /** The leader's total, in points. */
  line: number;
  out?: boolean;
}) {
  const d = standing.driver;
  const pct = (n: number) => `${Math.min(100, (n / scale) * 100)}%`;
  return (
    <li
      className={`grid grid-cols-[1.5rem_minmax(0,7rem)_minmax(0,1fr)_2.75rem] items-center gap-x-3 border-t border-line py-2.5 sm:grid-cols-[2rem_11rem_minmax(0,1fr)_3.5rem_4.5rem] sm:gap-x-5 ${
        out ? "opacity-55" : ""
      }`}
    >
      <span className="font-mono text-sm text-ink-mute tabular-nums">
        {standing.position}
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="hidden sm:block">
          <DriverAvatar
            driver={{ driver_id: d.id, code: d.code, team: d.team, team_color: d.color }}
            size={28}
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{d.lastName}</span>
          <span className="block font-mono text-[0.65rem] text-ink-mute">
            {out ? "Out" : gap === 0 ? "Leads" : `−${gap}`}
            {/* The most they can finish on, where the phone has no column for it. */}
            <span className="sm:hidden"> · max {max}</span>
          </span>
        </span>
      </span>

      <span aria-hidden className="relative block h-5">
        <span
          className="absolute inset-y-1.5 left-0"
          style={{ width: pct(max), background: tint(d.color, 0.18) }}
        />
        <span
          className="absolute inset-y-1.5 left-0"
          style={{ width: pct(standing.points), background: d.color }}
        />
        <span
          className="absolute -inset-y-2.5 w-px bg-ink/70"
          style={{ left: pct(line) }}
        />
      </span>

      <span className="text-right font-mono text-sm tabular-nums">{standing.points}</span>
      <span className="hidden text-right font-mono text-xs text-ink-mute tabular-nums sm:block">
        {max}
      </span>
    </li>
  );
}

export default function TitleFight({ fight }: { fight: Fight }) {
  const { leader, contenders, firstOut, pointsLeft, racesLeft, sprintsLeft } = fight;
  const name = `${leader.driver.firstName} ${leader.driver.lastName}`;

  if (fight.over) {
    return (
      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
          World champion
        </h2>
        <p className="display mt-3 text-3xl font-extrabold tracking-tight">{name}</p>
        <p className="mt-2 text-sm text-ink-dim">
          {leader.points} points, {leader.wins} {leader.wins === 1 ? "win" : "wins"}.
        </p>
      </section>
    );
  }

  const runnerUp = contenders[1]?.standing ?? firstOut;
  const lead = runnerUp ? leader.points - runnerUp.points : 0;
  const scale = leader.points + pointsLeft;
  const left = [
    `${racesLeft} ${racesLeft === 1 ? "Grand Prix" : "Grands Prix"}`,
    sprintsLeft > 0
      ? `${sprintsLeft} ${sprintsLeft === 1 ? "sprint" : "sprints"}`
      : "no sprints",
  ].join(", ");

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
          Title fight
        </h2>
        <p className="font-mono text-[0.7rem] text-ink-mute">
          {pointsLeft} points left · {left}
        </p>
      </div>

      <p className="display mt-3 text-2xl font-extrabold tracking-tight">
        {fight.settled
          ? `${leader.driver.lastName} can no longer be caught.`
          : `${contenders.length} drivers can still be champion.`}
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-dim">
        {fight.settled ? (
          `Nobody else can reach ${leader.points} points with ${pointsLeft} left to win — the title is decided with ${left} still to run.`
        ) : runnerUp ? (
          <>
            {leader.driver.lastName} is champion once the lead passes{" "}
            {pointsLeft} points. It is {lead} today, over{" "}
            {runnerUp.driver.lastName}.
          </>
        ) : null}
      </p>

      <figure className="mt-6">
        <div
          aria-hidden
          className="grid grid-cols-[1.5rem_minmax(0,7rem)_minmax(0,1fr)_2.75rem] gap-x-3 pb-2 font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase sm:grid-cols-[2rem_11rem_minmax(0,1fr)_3.5rem_4.5rem] sm:gap-x-5"
        >
          <span>Pos</span>
          <span>Driver</span>
          <span />
          <span className="text-right">Pts</span>
          <span className="hidden text-right sm:block">Max</span>
        </div>
        <ol className="border-b border-line">
          {contenders.map((c) => (
            <Row
              key={c.standing.driver.id}
              standing={c.standing}
              max={c.max}
              gap={c.gap}
              scale={scale}
              line={leader.points}
            />
          ))}
          {firstOut && (
            <Row
              standing={firstOut}
              max={firstOut.points + pointsLeft}
              gap={leader.points - firstOut.points}
              scale={scale}
              line={leader.points}
              out
            />
          )}
        </ol>
        <figcaption className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-mute">
          {`Solid: points so far. Faint: the most each driver can still add — a win in every Grand Prix (${RACE_MAX}) and sprint (${SPRINT_MAX}) left. The line is the leader's total: a bar that reaches it is still in the fight.`}
          {firstOut
            ? " The dimmed row is the best-placed driver it has already shut out."
            : ""}
        </figcaption>
      </figure>
    </section>
  );
}
