// Row types mirroring supabase/schema.sql (hand-written, kept intentionally small).

export type RaceStatus = "scheduled" | "locked" | "scored";

/** Private per-player data, readable only by its owner (and the service role). */
export interface PlayerDetails {
  id: string;
  first_name: string;
  last_name: string;
  country: string | null;   // ISO 3166-1 alpha-2
  birth_year: number | null;
  created_at: string;
  updated_at: string;
}

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
  sc_prob: number | null;
  sc_bet: boolean | null;
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
  sc_bet: boolean | null;
  updated_at: string;
}

export interface RaceResult {
  race_id: number;
  classification: Record<string, number>;
  dotd: string | null;
  safety_car: boolean | null;
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
  sc_bet?: boolean | null;
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
  /** false while the name is only a suggestion (OAuth signup, see /welcome). */
  username_set: boolean;
  /**
   * Which half of the championship call paints the profile (migration 0010).
   * Optional: a deploy that lands before the migration reads it as "driver".
   */
  theme?: "driver" | "team";
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
  /** Season points minus the model's, over the races this player entered. */
  margin: number;
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

/** What an invite link can show before you accept it — see `league_by_code()`. */
export interface LeaguePreview {
  id: number;
  name: string;
  member_count: number;
  owner_username: string;
  is_member: boolean;
}
