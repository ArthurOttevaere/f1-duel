import type { DriverStanding, Standings, Weekend } from "./types";

/**
 * Who can still be world champion — the arithmetic, not a forecast.
 *
 * A driver is in it while their points plus everything still to be awarded
 * reach the leader's current total. The leader's total can only grow, so a
 * driver this rules out is out for good, and the rule is the one the sport
 * itself uses when it says somebody is "mathematically" out. A driver who can
 * at best *draw level* stays in: a tie goes to countback, and the arithmetic
 * of countback is not worth getting wrong in public.
 *
 * Points still to be awarded are counted against what the standings already
 * hold, never against the clock: a round counts as done only once its result
 * is published *and* the standings stand after it. That way a weekend whose
 * sprint is in but whose Grand Prix is not still has its 25 points left, and a
 * driver is never ruled out on a table that is a session behind.
 */

/** The most one driver can take from one Grand Prix (no fastest-lap point since 2025). */
export const RACE_MAX = 25;
/** …and from one sprint. */
export const SPRINT_MAX = 8;

export interface Contender {
  standing: DriverStanding;
  /** Points behind the leader; 0 for the leader. */
  gap: number;
  /** The most they can finish the season on. */
  max: number;
}

export interface TitleFight {
  afterRound: number;
  racesLeft: number;
  sprintsLeft: number;
  pointsLeft: number;
  leader: DriverStanding;
  /** In championship order, leader first. Never empty. */
  contenders: Contender[];
  /** The best-placed driver who can no longer win, if any. */
  firstOut: DriverStanding | null;
  /** Nobody can catch the leader any more. */
  settled: boolean;
  /** Nothing left to award: the season is over. */
  over: boolean;
}

export function titleFight(
  standings: Standings,
  calendar: Weekend[],
  published: { races: Set<number>; sprints: Set<number> },
): TitleFight | null {
  const table = standings.drivers;
  const leader = table[0];
  if (!leader) return null;

  const counted = (round: number, set: Set<number>) =>
    round <= standings.round && set.has(round);

  let racesLeft = 0;
  let sprintsLeft = 0;
  for (const w of calendar) {
    if (!counted(w.round, published.races)) racesLeft += 1;
    if (w.sprint && !counted(w.round, published.sprints)) sprintsLeft += 1;
  }
  const pointsLeft = racesLeft * RACE_MAX + sprintsLeft * SPRINT_MAX;

  const contenders: Contender[] = [];
  let firstOut: DriverStanding | null = null;
  for (const s of table) {
    const max = s.points + pointsLeft;
    if (max >= leader.points) {
      contenders.push({ standing: s, gap: leader.points - s.points, max });
    } else if (!firstOut) {
      firstOut = s;
    }
  }

  return {
    afterRound: standings.round,
    racesLeft,
    sprintsLeft,
    pointsLeft,
    leader,
    contenders,
    firstOut,
    settled: contenders.length === 1,
    over: pointsLeft === 0,
  };
}
