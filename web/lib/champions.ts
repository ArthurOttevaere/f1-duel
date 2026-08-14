/**
 * What a championship pick is worth, in words and in points.
 *
 * The three tiers are the §2.3 table of `docs/GAME_DESIGN.md`. They live here
 * a second time on purpose: `jobs/settle_season.py` is what actually pays out,
 * this is what the profile *says* the pick is on course for. Any change to the
 * table has to land in both places — there are three rows, and importing
 * Python into a React page is not on the table.
 */

import type { SeasonPick } from "@/lib/types";

export type Tier = "leader" | "chasing" | "outsider";

const DRIVER_BONUS: Record<Tier, number> = {
  leader: 50,
  chasing: 75,
  outsider: 150,
};
const TEAM_BONUS: Record<Tier, number> = {
  leader: 30,
  chasing: 50,
  outsider: 90,
};

/** How the tier reads to a player, in the second person the rest of the site uses. */
export const TIER_LABEL: Record<Tier, string> = {
  leader: "led the championship when you locked it in",
  chasing: "sat P2–P3 when you locked it in",
  outsider: "was P4 or lower when you locked it in",
};

/**
 * The tier a rank falls in, or null when the rank isn't known yet — the weekly
 * sync fills `driver_rank_at_lock` in, so a pick made minutes ago has none.
 */
export function tierOf(rank: number | null | undefined): Tier | null {
  if (rank === null || rank === undefined) return null;
  return rank <= 1 ? "leader" : rank <= 3 ? "chasing" : "outsider";
}

export interface PickValue {
  driverTier: Tier | null;
  teamTier: Tier | null;
  /** Prorated driver bonus, or null while the rank is unknown. */
  driver: number | null;
  team: number | null;
  total: number | null;
  /** The fraction of the season that was still to run at lock (floor 0.2). */
  prorate: number | null;
  /** What the season settlement actually paid, once it has run. */
  awarded: number | null;
  /** True once the bonus is banked rather than merely on offer. */
  settled: boolean;
}

/**
 * What a pick is on course for. `prorate` missing is treated as a full season
 * remaining rather than as zero: the alternative is telling a player their
 * round-1 call is worth nothing because a weekly job hasn't run yet.
 */
export function pickValue(pick: SeasonPick): PickValue {
  const driverTier = tierOf(pick.driver_rank_at_lock);
  const teamTier = tierOf(pick.team_rank_at_lock);
  const prorate = pick.prorate === null ? null : Number(pick.prorate);
  const scale = prorate ?? 1;

  const driver = driverTier ? Math.round(DRIVER_BONUS[driverTier] * scale) : null;
  const team = teamTier ? Math.round(TEAM_BONUS[teamTier] * scale) : null;
  const awarded = pick.awarded_points === null ? null : Number(pick.awarded_points);

  return {
    driverTier,
    teamTier,
    driver,
    team,
    total: driver === null && team === null ? null : (driver ?? 0) + (team ?? 0),
    prorate,
    awarded,
    settled: awarded !== null,
  };
}
