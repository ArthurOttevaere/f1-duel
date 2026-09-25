import { cache } from "react";
import { owesSeasonPick } from "@/lib/auth";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * What the signed-in player still owes the game, for the badges in the nav.
 *
 * - `race`: a Grand Prix is open and they have no top 10 on it.
 * - `seasonPick`: no championship call this season. Unlike the /welcome
 *   screen this ignores the "later" cookie on purpose: /game's layout sends
 *   anyone with neither a pick nor that cookie to /welcome, so a badge that
 *   honoured the cookie would never be seen by anybody. The cookie delays
 *   the full-screen ask; the dot is the quiet version of it.
 *
 * Two small reads, in parallel, deduplicated per request — the nav renders
 * on every page, so this is the whole cost of the feature. Nothing at all
 * for a signed-out visitor.
 */
export const getPending = cache(async () => {
  const user = await getUser();
  if (!user) return { race: false, seasonPick: false };
  const [race, seasonPick] = await Promise.all([owesRaceEntry(user.id), owesSeasonPick()]);
  return { race, seasonPick };
});

/**
 * One round-trip: the next open race with the player's own prediction
 * embedded (RLS already limits `predictions` to their own row before lock),
 * so "open race, empty embed" is the answer.
 */
async function owesRaceEntry(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("races")
    .select("id, predictions(race_id)")
    .eq("status", "scheduled")
    .gt("race_at", new Date().toISOString())
    .eq("predictions.user_id", userId)
    .order("race_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return false;
  return ((data as { predictions: unknown[] | null }).predictions ?? []).length === 0;
}
