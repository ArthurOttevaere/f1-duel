/**
 * The real season, as the `/f1` section draws it.
 *
 * Nothing in here is game state. These shapes are read from Jolpica (the
 * Ergast mirror: calendar, qualifying, sprint, race, standings) and OpenF1
 * (free practice, which Ergast never carried), and they never touch Supabase
 * except to borrow the roster's colours. See `lib/f1/season.ts`.
 */

export type SessionKind =
  | "fp1"
  | "fp2"
  | "fp3"
  | "sprint_quali"
  | "sprint"
  | "quali"
  | "race";

export interface Session {
  kind: SessionKind;
  /** "Practice 1", "Sprint qualifying", "Grand Prix"… */
  name: string;
  /** UTC ISO. */
  start: string;
  /** UTC ISO — the published start plus the session's usual length. */
  end: string;
  /** The calendar has a date but no time yet. */
  tbc: boolean;
}

export interface Weekend {
  season: number;
  round: number;
  /** "United States Grand Prix". */
  name: string;
  circuitId: string;
  /** "Circuit of the Americas". */
  circuit: string;
  /** "Austin". */
  locality: string;
  country: string;
  /** IANA zone of the circuit, or null for a venue `timezones.ts` lacks. */
  timeZone: string | null;
  sprint: boolean;
  /** Chronological. */
  sessions: Session[];
}

/** A driver as the section draws one: an id for the portrait, a colour for the rule. */
export interface DriverRef {
  /** Ergast id — the same key as `drivers.driver_id`. */
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  team: string;
  color: string;
}

/** Race or sprint. */
export interface RaceRow {
  position: number;
  /** Ergast's positionText: a number, or R / D / E / W / F / N. */
  positionText: string;
  driver: DriverRef;
  grid: number | null;
  laps: number;
  /** "1:42:00.785" for the winner, "+7.335" behind, null when lapped or out. */
  time: string | null;
  /** "Finished", "+1 Lap", "Retired", "Collision"… */
  status: string;
  points: number;
  fastestLap: boolean;
}

export interface QualiRow {
  position: number;
  driver: DriverRef;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export interface PracticeRow {
  position: number;
  driver: DriverRef;
  /** Best lap, seconds. */
  best: number | null;
  /** Seconds to the fastest, 0 for P1. */
  gap: number | null;
  laps: number;
}

export type Classification =
  | { kind: "race" | "sprint"; rows: RaceRow[] }
  | { kind: "quali" | "sprint_quali"; rows: QualiRow[] }
  | { kind: "fp1" | "fp2" | "fp3"; rows: PracticeRow[] };

/** One past weekend in a line: who was on pole, who won what. */
export interface WeekendSummary {
  round: number;
  pole: DriverRef | null;
  sprintWinner: DriverRef | null;
  winner: DriverRef | null;
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driver: DriverRef;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  team: string;
  color: string;
}

export interface Standings {
  /** The round the table stands after. */
  round: number;
  drivers: DriverStanding[];
  constructors: ConstructorStanding[];
}
