/**
 * The season recap — one player's year against the model, told once it is over
 * (`docs/GAME_DESIGN.md` §2.3).
 *
 * Everything here is arithmetic on rows the site already publishes: a
 * player's `scores` (each with the full breakdown the race page draws), the
 * season's `races`, the roster, the board, and the championship call. Nothing
 * is stored for the recap and nothing is computed by a job — a re-score in
 * January changes the page the next time it is opened, which is the point.
 *
 * Two functions: `seasonState` says whether the recap may open at all, and
 * `loadRecap` builds one player's. They are separate because `/game` and the
 * profile only need the first.
 */

import type { createClient } from "@/lib/supabase/server";
import { pickValue } from "@/lib/champions";
import { getStandings } from "@/lib/f1/season";
import { shortName } from "@/lib/format";
import { driverColor, seasonPickColor, teamColor } from "@/lib/teams";
import type {
  Driver,
  LeaderboardRow,
  Profile,
  Race,
  Score,
  SeasonPick,
} from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface SeasonState {
  /** Every Grand Prix on the season's calendar has been scored. */
  over: boolean;
  /** `settle_season.py` has run: no championship call is left unpaid. */
  settled: boolean;
  /** Both — the only state in which the recap exists. */
  open: boolean;
}

/**
 * Whether the season is finished *and paid*.
 *
 * The recap is where the championship bonus lands, so it must not open on a
 * Sunday night in December with every call still reading "pending": the gate
 * is the settlement, not the chequered flag. `settle_season.py` is run by
 * hand, once — until it has, the site looks exactly as it did the week before.
 */
export async function seasonState(
  supabase: Supabase,
  season: number,
): Promise<SeasonState> {
  const [{ data: raceRows }, { count: unpaid, error }] = await Promise.all([
    supabase.from("races").select("status").eq("season", season),
    supabase
      .from("season_picks")
      .select("user_id", { count: "exact", head: true })
      .eq("season", season)
      .is("awarded_points", null),
  ]);
  const statuses = ((raceRows as Pick<Race, "status">[]) ?? []).map((r) => r.status);
  const over = statuses.length > 0 && statuses.every((s) => s === "scored");
  // A failed count is not "nothing left to pay".
  const settled = !error && (unpaid ?? 0) === 0;
  return { over, settled, open: over && settled };
}

export interface RecapRace {
  round: number;
  name: string;
  points: number;
  model: number;
  margin: number;
}

export interface Recap {
  season: number;
  username: string;
  /** The profile's colour (migration 0010), so the recap is the same player. */
  paint: string;
  /** Whose portrait stands for the player — their drivers' champion call. */
  avatarDriver: string | null;

  duels: number;
  won: number;
  drawn: number;
  lost: number;
  /** Race points only. */
  points: number;
  average: number;
  margin: number;
  /** Position on the season table, and how many players it holds. */
  rank: number | null;
  field: number;
  /** Grands Prix scored this season, entered or not. */
  seasonRaces: number;

  best: RecapRace;
  /** The heaviest defeat. Null for a player the model never beat. */
  worst: RecapRace | null;

  /** The exact call the model believed in least. Null without an exact hit. */
  boldest: {
    round: number;
    raceName: string;
    driverId: string;
    driverName: string;
    position: number;
    /** What the model gave that driver in that position, 0–1. */
    probability: number | null;
    multiplier: number;
    points: number;
  } | null;
  exactHits: number;
  /** Every position called, all season: ten a duel. */
  calls: number;

  /** The driver who earned this player the most. */
  banker: {
    driverId: string;
    name: string;
    color: string;
    points: number;
    /** Duels in which this driver was somewhere in the top 10. */
    picked: number;
  } | null;
  /** Calls for P1, and how many of them won. */
  winnerCalls: { made: number; right: number };

  dotd: { made: number; right: number };
  safetyCar: { made: number; right: number };
  /** Points from the two side bets together. */
  sidePoints: number;

  call: {
    driverName: string;
    team: string;
    lockedAt: string;
    /** Whether each half came in — null when the standings could not be read. */
    driverHit: boolean | null;
    teamHit: boolean | null;
    /** What each half was worth, prorated, had it come in. */
    driverWorth: number | null;
    teamWorth: number | null;
    /** The actual champions, when the standings could be read. */
    championDriver: string | null;
    championTeam: string | null;
    /** What `settle_season.py` paid. Null only in a preview. */
    awarded: number | null;
  } | null;

  /** Race points plus the championship bonus: the number the recap closes on. */
  total: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * One player's season. Null when there is nothing to tell: no such player, or
 * no duel raced. The caller decides whether the recap is open — this function
 * would happily narrate a season in progress, which is what the development
 * preview uses it for.
 */
export async function loadRecap(
  supabase: Supabase,
  username: string,
  season: number,
): Promise<Recap | null> {
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  const profile = profileRow as Profile | null;
  if (!profile) return null;

  const [
    { data: scoreRows },
    { data: raceRows },
    { data: rosterRows },
    { data: pickRow },
    { data: boardRows },
    standings,
  ] = await Promise.all([
    supabase.from("scores").select("*").eq("user_id", profile.id),
    supabase.from("races").select("*").eq("season", season),
    supabase.from("drivers").select("*").eq("season", season),
    supabase
      .from("season_picks")
      .select("*")
      .eq("user_id", profile.id)
      .eq("season", season)
      .maybeSingle(),
    supabase.rpc("standings_page", {
      p_league_id: null,
      p_limit: 1000,
      p_offset: 0,
    }),
    // The real championship, for the names of the champions. A recap that
    // cannot reach it still pays the right amount — it only stops saying
    // which half of the call earned it.
    getStandings(season).catch(() => null),
  ]);

  const races = new Map(((raceRows as Race[]) ?? []).map((r) => [r.id, r]));
  const roster = (rosterRows as Driver[]) ?? [];
  const byDriver = new Map(roster.map((d) => [d.driver_id, d]));
  const nameOf = (id: string) => byDriver.get(id)?.full_name ?? shortName(id);

  const scores = ((scoreRows as Score[]) ?? [])
    .filter((s) => races.has(s.race_id))
    .sort((a, b) => races.get(a.race_id)!.round - races.get(b.race_id)!.round);
  if (scores.length === 0) return null;

  const asRace = (s: Score): RecapRace => {
    const race = races.get(s.race_id)!;
    const points = Number(s.total);
    const model = Number(s.breakdown.model_total ?? 0);
    return {
      round: race.round,
      name: race.name,
      points,
      model,
      margin: round1(points - model),
    };
  };
  const duels = scores.map(asRace);

  const won = scores.filter((s) => s.beat_model).length;
  const drawn = scores.filter((s) => s.drew_model).length;
  const lost = scores.length - won - drawn;
  const points = round1(duels.reduce((sum, d) => sum + d.points, 0));
  const margin = round1(duels.reduce((sum, d) => sum + d.margin, 0));

  const best = duels.reduce((a, b) => (b.points > a.points ? b : a));
  const defeats = duels.filter((d) => d.margin < 0);
  const worst = defeats.length
    ? defeats.reduce((a, b) => (b.margin < a.margin ? b : a))
    : null;

  // ── The calls themselves ──
  let boldest: Recap["boldest"] = null;
  let exactHits = 0;
  let calls = 0;
  const winnerCalls = { made: 0, right: 0 };
  const earned = new Map<string, { points: number; picked: number }>();

  for (const s of scores) {
    const race = races.get(s.race_id)!;
    for (const slot of s.breakdown.slots ?? []) {
      calls += 1;
      const tally = earned.get(slot.driver) ?? { points: 0, picked: 0 };
      tally.points += Number(slot.points);
      tally.picked += 1;
      earned.set(slot.driver, tally);

      if (slot.position === 1) {
        winnerCalls.made += 1;
        if (slot.kind === "exact") winnerCalls.right += 1;
      }
      if (slot.kind !== "exact") continue;
      exactHits += 1;

      // Boldest = the highest multiplier; between two of the same, the one
      // the model believed in less; an unknown probability loses the tie.
      const p = slot.probability ?? 1;
      const better =
        !boldest ||
        slot.multiplier > boldest.multiplier ||
        (slot.multiplier === boldest.multiplier && p < (boldest.probability ?? 1));
      if (better) {
        boldest = {
          round: race.round,
          raceName: race.name,
          driverId: slot.driver,
          driverName: nameOf(slot.driver),
          position: slot.position,
          probability: slot.probability,
          multiplier: slot.multiplier,
          points: Number(slot.points),
        };
      }
    }
  }

  const top = [...earned.entries()].sort(
    (a, b) => b[1].points - a[1].points || b[1].picked - a[1].picked,
  )[0];

  const pick = pickRow as SeasonPick | null;
  const base = seasonPickColor(pick, roster);
  const championDriver = pick ? (byDriver.get(pick.champion_driver) ?? null) : null;
  const driverPaint = championDriver ? driverColor(championDriver, base) : base;
  const teamPaint = pick ? teamColor(pick.champion_team, roster, base) : base;
  const paint = profile.theme === "team" ? teamPaint : driverPaint;

  const banker =
    top && top[1].points > 0
      ? {
          driverId: top[0],
          name: nameOf(top[0]),
          color: byDriver.get(top[0])
            ? driverColor(byDriver.get(top[0])!, base)
            : base,
          points: round1(top[1].points),
          picked: top[1].picked,
        }
      : null;

  // ── Side bets ──
  const dotd = { made: 0, right: 0 };
  const safetyCar = { made: 0, right: 0 };
  let sidePoints = 0;
  for (const s of scores) {
    const bonuses = s.breakdown.bonuses ?? {};
    if (s.breakdown.dotd_pick) {
      dotd.made += 1;
      if (Number(bonuses.dotd ?? 0) > 0) dotd.right += 1;
    }
    if (s.breakdown.sc_bet !== null && s.breakdown.sc_bet !== undefined) {
      safetyCar.made += 1;
      if (Number(bonuses.safety_car ?? 0) > 0) safetyCar.right += 1;
    }
    sidePoints += Number(bonuses.dotd ?? 0) + Number(bonuses.safety_car ?? 0);
  }

  // ── The championship call ──
  let call: Recap["call"] = null;
  if (pick) {
    const value = pickValue(pick);
    const champion = standings?.drivers[0]?.driver ?? null;
    const championTeam = standings?.constructors[0]?.team ?? null;
    // The same loose match as `settle_season.py`: "Mercedes" against whatever
    // longer name either side carries.
    const sameTeam = (a: string, b: string) => {
      const x = a.toLowerCase();
      const y = b.toLowerCase();
      return x.includes(y) || y.includes(x);
    };
    call = {
      driverName: championDriver?.full_name ?? shortName(pick.champion_driver),
      team: pick.champion_team,
      lockedAt: pick.locked_at,
      driverHit: champion ? champion.id === pick.champion_driver : null,
      teamHit: championTeam ? sameTeam(championTeam, pick.champion_team) : null,
      driverWorth: value.driver,
      teamWorth: value.team,
      championDriver: champion
        ? `${champion.firstName} ${champion.lastName}`
        : null,
      championTeam,
      awarded: value.awarded,
    };
  }

  const board = (boardRows as LeaderboardRow[]) ?? [];
  const index = board.findIndex((row) => row.user_id === profile.id);

  return {
    season,
    username: profile.username,
    paint,
    avatarDriver: pick?.champion_driver ?? null,
    duels: scores.length,
    won,
    drawn,
    lost,
    points,
    average: round1(points / scores.length),
    margin,
    rank: index === -1 ? null : index + 1,
    field: board.length,
    seasonRaces: [...races.values()].filter((r) => r.status === "scored").length,
    best,
    worst,
    boldest,
    exactHits,
    calls,
    banker,
    winnerCalls,
    dotd,
    safetyCar,
    sidePoints: round1(sidePoints),
    call,
    total: round1(points + (call?.awarded ?? 0)),
  };
}
