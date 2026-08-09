/**
 * The poster's own view of a scored race.
 *
 * Deliberately flat and self-contained: the drawing code runs on a canvas in
 * the browser and must never reach back into Supabase rows, and this is the
 * whole payload the server page ships to the client for it.
 */

export interface PosterDriver {
  code: string;
  /** Last name, the way the grid says it: "Verstappen". */
  name: string;
  team: string;
  color: string;
  /** Whether a photo exists under /drivers — the drawing falls back to the code. */
  photo: string | null;
}

export type SlotKind = "exact" | "near" | "in_top10" | "miss";

export interface PosterSlot {
  /** 1–10. */
  position: number;
  /** Driver ids; any of them can be missing on an incomplete race. */
  mine: string | null;
  official: string | null;
  model: string | null;
  kind: SlotKind | null;
  modelKind: SlotKind | null;
  points: number;
  multiplier: number;
  /** The model's own arithmetic — what the points column shows when you sat the race out. */
  modelPoints: number;
  modelMultiplier: number;
}

export interface PosterStats {
  exact: number;
  near: number;
  inTop10: number;
  /** Mean |predicted − official| over your picks that were classified. */
  avgMiss: number | null;
}

export interface PosterCall {
  /** Driver name (DOTD) or "Yes"/"No" (safety car). */
  actual: string;
  mine: string | null;
  hit: boolean;
  /** The model's call, where it makes one (the safety car; never the DOTD). */
  model: string | null;
  modelHit: boolean;
}

/**
 * A race you never picked still exports: the sheet becomes the official
 * classification, with the model's race alongside it when it entered. The
 * fields that only exist because you played are null in that case — `total`
 * is the one the drawing keys off.
 */
export interface PosterData {
  season: number;
  round: number;
  raceName: string;
  circuit: string | null;
  country: string | null;
  raceAt: string | null;
  player: string;
  total: number | null;
  modelTotal: number | null;
  verdict: "beat" | "drew" | "lost" | null;
  duelBonus: number;
  slots: PosterSlot[];
  stats: PosterStats | null;
  modelStats: PosterStats | null;
  dotd: PosterCall | null;
  safetyCar: PosterCall | null;
  drivers: Record<string, PosterDriver>;
}
