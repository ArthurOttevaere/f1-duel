import { FRESH, getJson } from "./fetch";
import type { Weekend } from "./types";

/**
 * OpenF1 — the timing feed's archive, and the only free source of the two
 * sessions Ergast never published: free practice and sprint qualifying. The
 * jobs already read it for the same reason (`src/openf1.py`, ALMANAC §8.9).
 *
 * Free tier: 3 requests a second, 30 a minute, and a session's data lands
 * roughly half an hour after it ends. Live timing is paid, so a session under
 * way has nothing to show here and the page says so.
 */
const BASE = "https://api.openf1.org/v1";

export interface OfSession {
  session_key: number;
  meeting_key: number;
  session_name: string;
  date_start: string;
}

export interface OfResult {
  position: number | null;
  driver_number: number;
  number_of_laps: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  /** Seconds — a number for practice, [Q1, Q2, Q3] for a qualifying. */
  duration: number | (number | null)[] | null;
  gap_to_leader: number | string | (number | string | null)[] | null;
}

export interface OfDriver {
  driver_number: number;
  name_acronym: string;
  first_name: string | null;
  last_name: string | null;
  team_name: string | null;
  team_colour: string | null;
}

/**
 * Runs the calls one after another. Six parallel requests on a cold cache is
 * a 429 on a three-a-second tier, and a 429 is not cached, so it would come
 * back on the next view too. Sequential costs a second, once per window.
 */
async function inTurn<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const out: T[] = [];
  for (const task of tasks) out.push(await task());
  return out;
}

/** OpenF1's names for the two sessions it is read for, across the eras. */
const NAMES = {
  fp1: ["Practice 1"],
  fp2: ["Practice 2"],
  fp3: ["Practice 3"],
  // 2023 called it the shootout.
  sprint_quali: ["Sprint Qualifying", "Sprint Shootout"],
} as const;

export type OfKind = keyof typeof NAMES;

/**
 * The OpenF1 sessions of one Jolpica weekend.
 *
 * The two APIs share no key. A meeting is matched on its Grand Prix starting
 * within twelve hours of the calendar's — a venue name would do until the day
 * one is renamed (Sakhir's round run at Sepang, `jobs/venues.py`).
 */
export interface OfWeekend {
  meeting: number;
  keys: Partial<Record<OfKind, number>>;
}

export async function fetchWeekendSessions(
  weekend: Weekend,
): Promise<OfWeekend | null> {
  const race = weekend.sessions.find((s) => s.kind === "race");
  if (!race) return null;
  const all = await getJson<OfSession[]>(
    `${BASE}/sessions?year=${weekend.season}`,
    FRESH.calendar,
  );
  const raceAt = new Date(race.start).getTime();
  const gp = all.find(
    (s) =>
      s.session_name === "Race" &&
      Math.abs(new Date(s.date_start).getTime() - raceAt) < 12 * 3_600_000,
  );
  if (!gp) return null;

  const keys: Partial<Record<OfKind, number>> = {};
  for (const s of all) {
    if (s.meeting_key !== gp.meeting_key) continue;
    for (const [kind, names] of Object.entries(NAMES) as [OfKind, readonly string[]][]) {
      if (names.includes(s.session_name)) keys[kind] = s.session_key;
    }
  }
  return { meeting: gp.meeting_key, keys };
}

/**
 * Results and the driver list for a set of sessions. Results are fetched only
 * for keys the caller passes, so a session that has not ended costs nothing.
 */
export async function fetchSessionResults(
  meeting: number,
  keys: number[],
  revalidate: number,
): Promise<{ results: Map<number, OfResult[]>; drivers: Map<number, OfDriver> }> {
  const results = new Map<number, OfResult[]>();
  const drivers = new Map<number, OfDriver>();
  if (keys.length === 0) return { results, drivers };

  const rows = await inTurn(
    keys.map((key) => () =>
      getJson<OfResult[]>(`${BASE}/session_result?session_key=${key}`, revalidate)
        // A session that ended minutes ago answers 404 until it is processed.
        .catch(() => [] as OfResult[]),
    ),
  );
  keys.forEach((key, i) => results.set(key, rows[i]));

  // The whole meeting's entry list, not one session's: a rookie who only ran
  // Practice 1 is in no other session's list.
  const list = await getJson<OfDriver[]>(
    `${BASE}/drivers?meeting_key=${meeting}`,
    revalidate,
  ).catch(() => [] as OfDriver[]);
  for (const d of list) drivers.set(d.driver_number, d);

  return { results, drivers };
}
