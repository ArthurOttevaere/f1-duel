/**
 * Constructor colours, and what to do when the database hasn't got one.
 *
 * `drivers.team_color` comes from FastF1 (`jobs/sync_schedule.py`) and is
 * nullable: for a season FastF1 has no session data for yet, and for any team
 * it doesn't recognise, the roster syncs with `team_color = null`. Everything
 * that paints with a team colour then fell back to grey — or, on the profile
 * header, to the site's red, which is how a Mercedes pick ended up looking
 * like a Ferrari one.
 *
 * So: the database wins when it has an answer, this table answers when it
 * doesn't, and grey is the last resort rather than the second one.
 */

/** Where a colour ends up when nothing at all is known. Never red — red is a
 *  team's colour here, not a neutral. */
export const NEUTRAL_COLOR = "#6c7280";

/**
 * Matched against the team name with everything but letters and digits
 * stripped, so "Red Bull Racing", "red-bull" and "RedBull" all land together.
 * First match wins, which is why the compound names come before the short
 * ones ("racingbulls" must be tested before a bare "rb").
 *
 * Audi and Cadillac are the 2026 newcomers and their values here are a best
 * guess at their identity colours — the moment FastF1 has a session for them,
 * the real value takes over and this row stops being consulted.
 */
const TEAM_COLORS: [match: string, color: string][] = [
  ["mclaren", "#ff8000"],
  ["ferrari", "#e8002d"],
  ["redbull", "#3671c6"],
  ["mercedes", "#27f4d2"],
  ["astonmartin", "#229971"],
  ["alpine", "#ff87bc"],
  ["williams", "#64c4ff"],
  ["racingbulls", "#6692ff"],
  ["visacashapp", "#6692ff"],
  ["alphatauri", "#6692ff"],
  ["haas", "#b6babd"],
  ["kicksauber", "#52e252"],
  ["sauber", "#52e252"],
  ["audi", "#009597"],
  ["cadillac", "#c8a45c"],
  ["rb", "#6692ff"],
];

function normalize(team: string): string {
  return team.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The fallback colour for a team name, or null if it isn't one we know. */
export function knownTeamColor(team: string | null | undefined): string | null {
  if (!team) return null;
  const key = normalize(team);
  if (!key) return null;
  return TEAM_COLORS.find(([match]) => key.includes(match))?.[1] ?? null;
}

/** What a driver should be painted in: their team's colour, whatever the source. */
export function driverColor(
  driver: { team?: string | null; team_color?: string | null } | null | undefined,
  fallback: string = NEUTRAL_COLOR,
): string {
  return driver?.team_color ?? knownTeamColor(driver?.team) ?? fallback;
}

/** Same, for a team on its own (the constructors' picker, the champion pick). */
export function teamColor(
  team: string | null | undefined,
  roster: { team: string; team_color: string | null }[] = [],
  fallback: string = NEUTRAL_COLOR,
): string {
  if (!team) return fallback;
  const key = normalize(team);
  const fromRoster = roster.find(
    (d) => normalize(d.team) === key && d.team_color,
  )?.team_color;
  return fromRoster ?? knownTeamColor(team) ?? fallback;
}

/**
 * The colour a profile wears all season (docs/GAME_DESIGN.md §2.3).
 *
 * Tries, in order: the champion driver's own colour, any team-mate's, the
 * colour of the team they also picked, and finally the two name tables. A
 * profile only goes neutral if neither the driver nor the team is anything
 * this season's roster or this file has heard of.
 */
export function seasonPickColor(
  pick: { champion_driver: string; champion_team: string } | null | undefined,
  roster: { driver_id: string; team: string; team_color: string | null }[],
): string {
  if (!pick) return NEUTRAL_COLOR;
  const driver = roster.find((d) => d.driver_id === pick.champion_driver);

  /** A team's colour from anyone on it this season, else from the table. */
  const ofTeam = (team: string | null | undefined): string | null => {
    if (!team) return null;
    const key = normalize(team);
    return (
      roster.find((d) => normalize(d.team) === key && d.team_color)
        ?.team_color ?? knownTeamColor(team)
    );
  };

  return (
    driver?.team_color ??
    ofTeam(driver?.team) ??
    ofTeam(pick.champion_team) ??
    NEUTRAL_COLOR
  );
}

/**
 * `#rrggbb` → `rgb(r g b / alpha)`.
 *
 * Because the old code built its tints by pasting an alpha suffix onto the
 * hex string (`${theme}2e`), which only works if the value really is a
 * six-digit hex with a leading `#` — an `rgb()` string or a three-digit hex
 * from the database silently produced an invalid colour and no tint at all.
 * Anything unparseable is returned untouched, so the worst case is a solid
 * colour rather than a broken declaration.
 */
export function tint(color: string, alpha: number): string {
  const hex = color.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
