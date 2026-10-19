import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { NEUTRAL_COLOR, driverColor, knownTeamColor, teamColor } from "@/lib/teams";
import type { Driver } from "@/lib/types";
import { FRESH } from "./fetch";
import { lapTime } from "./format";
import {
  fetchCalendar,
  fetchConstructorStandings,
  fetchDriverStandings,
  fetchQualifying,
  fetchRaceResult,
  fetchSeasonFirsts,
  type Paint,
} from "./jolpica";
import {
  fetchSessionResults,
  fetchWeekendSessions,
  type OfDriver,
  type OfKind,
  type OfResult,
} from "./openf1";
import type {
  Classification,
  DriverRef,
  PracticeRow,
  QualiRow,
  SessionKind,
  Standings,
  Weekend,
  WeekendSummary,
} from "./types";

/**
 * The `/f1` section's reads, composed.
 *
 * Every function here is request-cached with `cache()`: the abort signal on
 * each fetch (`fetch.ts`) opts it out of Next's own per-render memoisation,
 * and the layout and the page both want the calendar.
 *
 * The one thing borrowed from the game's database is the roster, for
 * colours and portraits — read with the public client, so it costs no
 * session and carries no game data.
 */

type RosterRow = Pick<Driver, "driver_id" | "code" | "full_name" | "team" | "team_color">;

const roster = cache(async (season: number): Promise<RosterRow[]> => {
  try {
    const { data } = await createPublicClient()
      .from("drivers")
      .select("driver_id, code, full_name, team, team_color")
      .eq("season", season);
    return (data as RosterRow[]) ?? [];
  } catch {
    // Colours are a nicety; the tables stand without them.
    return [];
  }
});

/** Ergast driver + the team they drove for → a `DriverRef` in that team's colour. */
const painter = cache(async (season: number): Promise<Paint> => {
  const rows = await roster(season);
  return (d, c) => ({
    id: d.driverId,
    code: d.code ?? d.familyName.slice(0, 3).toUpperCase(),
    firstName: d.givenName,
    lastName: d.familyName,
    team: c.name,
    color: teamColor(c.name, rows),
  });
});

export const getCalendar = cache((season: number) => fetchCalendar(season));

/**
 * The instant this request is rendered at, the same for every component that
 * asks — so a session cannot be "done" in the page and "under way" in the
 * layout, and the weekend reads cached by `now` collapse into one.
 */
export const renderNow = cache((): number => Date.now());

/** The weekend in progress, else the next one, else null (season over). */
export function currentWeekend(calendar: Weekend[], now: number): Weekend | null {
  return (
    calendar.find((w) => {
      const last = w.sessions[w.sessions.length - 1];
      return last && new Date(last.end).getTime() > now;
    }) ?? null
  );
}

/** The last weekend whose Grand Prix has finished, or null before round 1. */
export function lastWeekend(calendar: Weekend[], now: number): Weekend | null {
  let last: Weekend | null = null;
  for (const w of calendar) {
    const race = w.sessions.find((s) => s.kind === "race");
    if (race && new Date(race.end).getTime() <= now) last = w;
  }
  return last;
}

// ── The archive ──────────────────────────────────────────────────────────────

export const getSeasonSummaries = cache(
  async (season: number): Promise<WeekendSummary[]> => {
    const paint = await painter(season);
    const [winners, sprints, poles] = await Promise.all([
      fetchSeasonFirsts(season, "race", paint),
      fetchSeasonFirsts(season, "sprint", paint),
      fetchSeasonFirsts(season, "quali", paint),
    ]);
    const rounds = new Set([...winners.keys(), ...sprints.keys(), ...poles.keys()]);
    return [...rounds]
      .sort((a, b) => a - b)
      .map((round) => ({
        round,
        pole: poles.get(round) ?? null,
        sprintWinner: sprints.get(round) ?? null,
        winner: winners.get(round) ?? null,
      }));
  },
);

// ── One weekend ──────────────────────────────────────────────────────────────

/**
 * What a started session has to show: its classification, or "pending" while
 * the source has not published it (OpenF1 takes about half an hour, Jolpica
 * a few hours), or "unavailable" when the source could not be reached.
 */
export type SessionOutcome = Classification | "pending" | "unavailable";

export interface WeekendResults {
  weekend: Weekend;
  /** One entry per session that has started; absent means not yet. */
  outcomes: Partial<Record<SessionKind, SessionOutcome>>;
}

/** An OpenF1 entrant → a `DriverRef`, through the roster when it knows them. */
function ofDriver(
  number: number,
  drivers: Map<number, OfDriver>,
  rows: RosterRow[],
): DriverRef {
  const d = drivers.get(number);
  const code = d?.name_acronym ?? String(number);
  const known = rows.find((r) => r.code === code);
  // The roster's spelling wins: OpenF1 drops accents ("Hulkenberg", "Perez")
  // and the Jolpica tables on the same page keep them.
  const knownParts = known?.full_name.split(" ");
  const raw = knownParts?.pop() ?? d?.last_name ?? code;
  // OpenF1 sets surnames in capitals on some entries ("NORRIS").
  const last =
    raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : raw;
  const team = known?.team ?? d?.team_name ?? "";
  return {
    id: known?.driver_id ?? last.toLowerCase(),
    code,
    firstName: knownParts?.join(" ") ?? d?.first_name ?? "",
    lastName: last,
    team,
    color: known
      ? driverColor(known)
      : d?.team_colour
        ? `#${d.team_colour}`
        : (knownTeamColor(team) ?? NEUTRAL_COLOR),
  };
}

function practiceRows(
  results: OfResult[],
  drivers: Map<number, OfDriver>,
  rows: RosterRow[],
): PracticeRow[] {
  return results
    .filter((r) => r.position !== null)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((r) => ({
      position: r.position as number,
      driver: ofDriver(r.driver_number, drivers, rows),
      best: typeof r.duration === "number" ? r.duration : null,
      gap: typeof r.gap_to_leader === "number" ? r.gap_to_leader : null,
      laps: r.number_of_laps ?? 0,
    }));
}

function shootoutRows(
  results: OfResult[],
  drivers: Map<number, OfDriver>,
  rows: RosterRow[],
): QualiRow[] {
  return results
    .filter((r) => r.position !== null)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
    .map((r) => {
      const t = Array.isArray(r.duration) ? r.duration : [];
      return {
        position: r.position as number,
        driver: ofDriver(r.driver_number, drivers, rows),
        q1: lapTime(t[0]),
        q2: lapTime(t[1]),
        q3: lapTime(t[2]),
      };
    });
}

async function settle<T>(
  work: Promise<T>,
  ok: (value: T) => SessionOutcome,
): Promise<SessionOutcome> {
  try {
    return ok(await work);
  } catch {
    return "unavailable";
  }
}

export const getWeekendResults = cache(
  async (season: number, round: number, now: number): Promise<WeekendResults | null> => {
    const calendar = await getCalendar(season);
    const weekend = calendar.find((w) => w.round === round);
    if (!weekend) return null;

    const started = new Set(
      weekend.sessions
        .filter((s) => new Date(s.start).getTime() <= now)
        .map((s) => s.kind),
    );
    const outcomes: WeekendResults["outcomes"] = {};
    if (started.size === 0) return { weekend, outcomes };

    // A weekend a few days gone is settled: penalties are in, nothing moves.
    const lastEnd = new Date(weekend.sessions[weekend.sessions.length - 1].end).getTime();
    const revalidate = now - lastEnd > 3 * 86_400_000 ? FRESH.settled : FRESH.live;

    const [paint, rows] = await Promise.all([painter(season), roster(season)]);
    const nonEmpty = <R,>(kind: Classification["kind"]) => (list: R[]) =>
      list.length > 0 ? ({ kind, rows: list } as Classification) : "pending";

    // Jolpica: qualifying, sprint, Grand Prix.
    const jolpica = Promise.all([
      started.has("quali")
        ? settle(fetchQualifying(season, round, revalidate, paint), nonEmpty("quali"))
        : null,
      started.has("sprint")
        ? settle(fetchRaceResult(season, round, "sprint", revalidate, paint), nonEmpty("sprint"))
        : null,
      started.has("race")
        ? settle(fetchRaceResult(season, round, "race", revalidate, paint), nonEmpty("race"))
        : null,
    ]);

    // OpenF1: practice and sprint qualifying.
    const wanted = (["fp1", "fp2", "fp3", "sprint_quali"] as OfKind[]).filter((k) =>
      started.has(k),
    );
    const openf1 = (async (): Promise<Partial<Record<OfKind, SessionOutcome>>> => {
      if (wanted.length === 0) return {};
      try {
        const of = await fetchWeekendSessions(weekend);
        if (!of) return Object.fromEntries(wanted.map((k) => [k, "pending"]));
        const keys = wanted
          .map((k) => [k, of.keys[k]] as const)
          .filter((p): p is [OfKind, number] => p[1] !== undefined);
        const { results, drivers } = await fetchSessionResults(
          of.meeting,
          keys.map(([, key]) => key),
          revalidate,
        );
        const out: Partial<Record<OfKind, SessionOutcome>> = {};
        for (const k of wanted) {
          const key = of.keys[k];
          const list = key === undefined ? [] : (results.get(key) ?? []);
          if (list.length === 0) {
            out[k] = "pending";
          } else if (k === "sprint_quali") {
            out[k] = { kind: k, rows: shootoutRows(list, drivers, rows) };
          } else {
            out[k] = { kind: k, rows: practiceRows(list, drivers, rows) };
          }
        }
        return out;
      } catch {
        return Object.fromEntries(wanted.map((k) => [k, "unavailable"]));
      }
    })();

    const [[quali, sprint, race], practice] = await Promise.all([jolpica, openf1]);
    Object.assign(outcomes, practice);
    if (quali) outcomes.quali = quali;
    if (sprint) outcomes.sprint = sprint;
    if (race) outcomes.race = race;
    return { weekend, outcomes };
  },
);

// ── Standings ────────────────────────────────────────────────────────────────

export const getStandings = cache(async (season: number): Promise<Standings | null> => {
  const [rows, drivers, constructors] = await Promise.all([
    roster(season),
    fetchDriverStandings(season),
    fetchConstructorStandings(season),
  ]);
  if (!drivers || drivers.rows.length === 0) return null;
  const paint = await painter(season);

  return {
    round: drivers.round,
    drivers: drivers.rows.map((r, i) => ({
      // A driver excluded from the table has no `position`; keep the order.
      position: Number(r.position ?? i + 1),
      points: Number(r.points) || 0,
      wins: Number(r.wins) || 0,
      // The team they drive for now — the last of the season's constructors.
      driver: paint(r.Driver, r.Constructors[r.Constructors.length - 1] ?? {
        constructorId: "",
        name: "",
      }),
    })),
    constructors: (constructors?.rows ?? []).map((r, i) => ({
      position: Number(r.position ?? i + 1),
      points: Number(r.points) || 0,
      wins: Number(r.wins) || 0,
      team: r.Constructor.name,
      color: teamColor(r.Constructor.name, rows),
    })),
  };
});

/** Rounds whose Grand Prix / sprint result is published — what the table can hold. */
export async function publishedRounds(season: number) {
  const summaries = await getSeasonSummaries(season);
  return {
    races: new Set(summaries.filter((s) => s.winner).map((s) => s.round)),
    sprints: new Set(summaries.filter((s) => s.sprintWinner).map((s) => s.round)),
  };
}
