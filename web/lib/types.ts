// Row types mirroring supabase/schema.sql (hand-written, kept intentionally small).

export type RaceStatus = "scheduled" | "locked" | "scored";

export interface Race {
  id: number;
  season: number;
  round: number;
  name: string;
  circuit: string | null;
  country: string | null;
  quali_at: string | null;
  race_at: string | null;
  status: RaceStatus;
}

export interface Driver {
  season: number;
  driver_id: string;
  code: string;
  full_name: string;
  team: string;
  team_color: string | null;
  active: boolean;
}

export interface ModelEntry {
  race_id: number;
  predicted_order: string[];
  prob_matrix: Record<string, number[]>;
  pre_quali: boolean;
  total: number | null;
  breakdown: ScoreBreakdown | null;
  locked_at: string;
}

export interface Prediction {
  id: number;
  user_id: string;
  race_id: number;
  picks: string[];
  dotd: string | null;
  updated_at: string;
}

export interface RaceResult {
  race_id: number;
  classification: Record<string, number>;
  dotd: string | null;
  scored_at: string | null;
}

export interface SlotScore {
  position: number;
  driver: string;
  actual: number | null;
  kind: "exact" | "near" | "in_top10" | "miss";
  base: number;
  probability: number | null;
  multiplier: number;
  points: number;
}

export interface ScoreBreakdown {
  slots: SlotScore[];
  bonuses: Record<string, number>;
  dotd_pick?: string | null;
  model_total?: number | null;
  total: number;
  beat_model?: boolean;
  drew_model?: boolean;
}

export interface Score {
  race_id: number;
  user_id: string;
  total: number;
  breakdown: ScoreBreakdown;
  beat_model: boolean;
  drew_model: boolean;
}

export interface Profile {
  id: string;
  username: string;
  created_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  username: string;
  races_played: number;
  points: number;
  duel_wins: number;
  duel_draws: number;
  duel_losses: number;
}

export interface SeasonPick {
  user_id: string;
  season: number;
  champion_driver: string;
  champion_team: string;
  locked_at: string;
  driver_rank_at_lock: number | null;
  team_rank_at_lock: number | null;
  prorate: number | null;
  awarded_points: number | null;
}

export interface League {
  id: number;
  name: string;
  code: string;
  owner_id: string;
  created_at: string;
}
