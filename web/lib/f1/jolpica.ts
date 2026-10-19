import { FRESH, getJson } from "./fetch";
import { circuitTimeZone } from "./timezones";
import type {
  DriverRef,
  QualiRow,
  RaceRow,
  Session,
  SessionKind,
  Weekend,
} from "./types";

/**
 * Jolpica — the maintained Ergast mirror the jobs already read
 * (`sync_schedule.py`, `settle_season.py`). Calendar with every session's
 * start, and every *published* result: qualifying, sprint, Grand Prix,
 * standings. It has never carried free practice, and it has no endpoint for
 * sprint qualifying either (404) — both are `openf1.ts`.
 */
const BASE = "https://api.jolpi.ca/ergast/f1";

// ── Raw shapes, only the fields read ────────────────────────────────────────

interface When {
  date: string;
  time?: string;
}

interface RawRace extends When {
  season: string;
  round: string;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: { locality: string; country: string };
  };
  FirstPractice?: When;
  SecondPractice?: When;
  ThirdPractice?: When;
  SprintQualifying?: When;
  Sprint?: When;
  Qualifying?: When;
}

export interface RawDriver {
  driverId: string;
  code?: string;
  givenName: string;
  familyName: string;
}

export interface RawConstructor {
  constructorId: string;
  name: string;
}

interface RawResult {
  position: string;
  positionText: string;
  points: string;
  Driver: RawDriver;
  Constructor: RawConstructor;
  grid?: string;
  laps: string;
  status: string;
  Time?: { time: string };
  FastestLap?: { rank?: string };
}

interface RawQuali {
  position: string;
  Driver: RawDriver;
  Constructor: RawConstructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

interface RaceTable<T> {
  MRData: { RaceTable: { Races: (RawRace & T)[] } };
}

interface StandingsTable<T> {
  MRData: {
    StandingsTable: { StandingsLists: ({ round: string } & T)[] };
  };
}

export interface RawDriverStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: RawDriver;
  Constructors: RawConstructor[];
}

export interface RawConstructorStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: RawConstructor;
}

// ── Calendar ─────────────────────────────────────────────────────────────────

/** How long each session usually runs, to tell "under way" from "done". */
const LENGTH_MIN: Record<SessionKind, number> = {
  fp1: 60,
  fp2: 60,
  fp3: 60,
  sprint_quali: 45,
  sprint: 60,
  quali: 60,
  race: 120,
};

export const SESSION_NAME: Record<SessionKind, string> = {
  fp1: "Practice 1",
  fp2: "Practice 2",
  fp3: "Practice 3",
  sprint_quali: "Sprint qualifying",
  sprint: "Sprint",
  quali: "Qualifying",
  race: "Grand Prix",
};

function session(kind: SessionKind, when: When | undefined): Session | null {
  if (!when?.date) return null;
  const tbc = !when.time;
  const start = new Date(`${when.date}T${when.time ?? "00:00:00Z"}`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + LENGTH_MIN[kind] * 60_000);
  return {
    kind,
    name: SESSION_NAME[kind],
    start: start.toISOString(),
    end: end.toISOString(),
    tbc,
  };
}

function toWeekend(r: RawRace): Weekend {
  const sessions = [
    session("fp1", r.FirstPractice),
    session("fp2", r.SecondPractice),
    session("fp3", r.ThirdPractice),
    session("sprint_quali", r.SprintQualifying),
    session("sprint", r.Sprint),
    session("quali", r.Qualifying),
    session("race", r),
  ]
    .filter((s): s is Session => s !== null)
    .sort((a, b) => a.start.localeCompare(b.start));

  return {
    season: Number(r.season),
    round: Number(r.round),
    name: r.raceName,
    circuitId: r.Circuit.circuitId,
    circuit: r.Circuit.circuitName,
    locality: r.Circuit.Location.locality,
    country: r.Circuit.Location.country,
    timeZone: circuitTimeZone(r.Circuit.circuitId),
    sprint: Boolean(r.Sprint),
    sessions,
  };
}

export async function fetchCalendar(season: number): Promise<Weekend[]> {
  const data = await getJson<RaceTable<object>>(
    `${BASE}/${season}.json?limit=100`,
    FRESH.calendar,
  );
  return data.MRData.RaceTable.Races.map(toWeekend).sort(
    (a, b) => a.round - b.round,
  );
}

// ── Classifications ──────────────────────────────────────────────────────────

/** Turns an Ergast driver + the constructor they drove for into a `DriverRef`. */
export type Paint = (driver: RawDriver, team: RawConstructor) => DriverRef;

const int = (s: string | undefined): number | null => {
  const n = Number(s);
  return s === undefined || s === "" || Number.isNaN(n) ? null : n;
};

/**
 * Jolpica now files a lapped car as status "Lapped" with a time gap measured
 * against nobody in particular ("+2.171" for a car a lap down). A timing
 * screen prints laps down for those, so that is what the row carries: a time
 * only for cars on the lead lap, laps down for the rest of the finishers, and
 * the reason ("Retired", "Collision") for everyone else.
 */
function raceRows(rows: RawResult[], paint: Paint): RaceRow[] {
  const leaderLaps = Math.max(0, ...rows.map((r) => Number(r.laps) || 0));
  return rows.map((r) => {
    const laps = Number(r.laps) || 0;
    const down = leaderLaps - laps;
    const finished =
      r.status === "Finished" || r.status === "Lapped" || /^\+\d+ Laps?$/.test(r.status);
    const onLeadLap = finished && down === 0;
    return {
      position: Number(r.position),
      positionText: r.positionText,
      driver: paint(r.Driver, r.Constructor),
      grid: int(r.grid),
      laps,
      time: onLeadLap ? r.Time?.time || null : null,
      status:
        finished && down > 0 ? `+${down} lap${down > 1 ? "s" : ""}` : r.status,
      points: Number(r.points) || 0,
      fastestLap: r.FastestLap?.rank === "1",
    };
  });
}

/** A round's results, or [] before they are published. */
export async function fetchRaceResult(
  season: number,
  round: number,
  kind: "race" | "sprint",
  revalidate: number,
  paint: Paint,
): Promise<RaceRow[]> {
  const path = kind === "race" ? "results" : "sprint";
  const key = kind === "race" ? "Results" : "SprintResults";
  const data = await getJson<RaceTable<Record<string, RawResult[]>>>(
    `${BASE}/${season}/${round}/${path}.json?limit=100`,
    revalidate,
  );
  const race = data.MRData.RaceTable.Races[0];
  return race ? raceRows(race[key] ?? [], paint) : [];
}

export async function fetchQualifying(
  season: number,
  round: number,
  revalidate: number,
  paint: Paint,
): Promise<QualiRow[]> {
  const data = await getJson<RaceTable<{ QualifyingResults?: RawQuali[] }>>(
    `${BASE}/${season}/${round}/qualifying.json?limit=100`,
    revalidate,
  );
  const race = data.MRData.RaceTable.Races[0];
  return (race?.QualifyingResults ?? []).map((q) => ({
    position: Number(q.position),
    driver: paint(q.Driver, q.Constructor),
    q1: q.Q1 || null,
    q2: q.Q2 || null,
    q3: q.Q3 || null,
  }));
}

// ── The season in three requests ─────────────────────────────────────────────

/**
 * The P1 of every round for one kind of session — a single request each,
 * because Ergast can filter a whole season by finishing position. This is
 * what keeps the results archive at three upstream calls however far into
 * the season it is.
 */
export async function fetchSeasonFirsts(
  season: number,
  kind: "race" | "sprint" | "quali",
  paint: Paint,
): Promise<Map<number, DriverRef>> {
  const path =
    kind === "race" ? "results/1" : kind === "sprint" ? "sprint/1" : "qualifying/1";
  const key =
    kind === "race" ? "Results" : kind === "sprint" ? "SprintResults" : "QualifyingResults";
  const data = await getJson<
    RaceTable<Record<string, { Driver: RawDriver; Constructor: RawConstructor }[]>>
  >(`${BASE}/${season}/${path}.json?limit=100`, FRESH.live);

  const out = new Map<number, DriverRef>();
  for (const race of data.MRData.RaceTable.Races) {
    const first = race[key]?.[0];
    if (first) out.set(Number(race.round), paint(first.Driver, first.Constructor));
  }
  return out;
}

// ── Standings ────────────────────────────────────────────────────────────────

export async function fetchDriverStandings(season: number) {
  const data = await getJson<
    StandingsTable<{ DriverStandings: RawDriverStanding[] }>
  >(`${BASE}/${season}/driverstandings.json?limit=100`, FRESH.live);
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return list
    ? { round: Number(list.round), rows: list.DriverStandings }
    : null;
}

export async function fetchConstructorStandings(season: number) {
  const data = await getJson<
    StandingsTable<{ ConstructorStandings: RawConstructorStanding[] }>
  >(`${BASE}/${season}/constructorstandings.json?limit=100`, FRESH.live);
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return list
    ? { round: Number(list.round), rows: list.ConstructorStandings }
    : null;
}
