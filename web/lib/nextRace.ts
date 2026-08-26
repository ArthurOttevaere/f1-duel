import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";

export interface NextRace {
  round: number;
  name: string;
  circuit: string | null;
  country: string | null;
  race_at: string;
}

/**
 * The next Grand Prix, or null between seasons.
 *
 * Two things in the hero need this — the countdown widget and the circuit
 * trace it sits beside — and they must agree about which race is next.
 * Request-cached, like `getOwnProfile`, so both reads collapse into one query.
 */
export const nextRace = cache(async (): Promise<NextRace | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("races")
    .select("round, name, circuit, country, race_at")
    .eq("season", CURRENT_SEASON)
    .not("race_at", "is", null)
    .gte("race_at", new Date().toISOString())
    .order("race_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as NextRace | null) ?? null;
});
