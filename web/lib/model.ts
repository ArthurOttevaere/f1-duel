import type { createClient } from "@/lib/supabase/server";

export interface ModelRaceEntry {
  race_id: number;
  total: number | null;
  counts_in_standings: boolean;
}

/**
 * The model's scored races, and whether each one counts towards its season
 * total (migration 0006: the operator can drop past races so the machine
 * doesn't meet new players 400 points up — race pages still show the real
 * score either way).
 *
 * Falls back to counting everything if the column isn't there, because a
 * migration that hasn't been applied yet should cost the board its newest
 * behaviour, not its ability to render.
 *
 * It lived in the standings page until the end-of-season screen needed the
 * same number: two callers, one definition.
 */
export async function modelEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ModelRaceEntry[]> {
  const flagged = await supabase
    .from("model_entries")
    .select("race_id, total, counts_in_standings");
  if (!flagged.error) return (flagged.data as ModelRaceEntry[]) ?? [];

  const plain = await supabase.from("model_entries").select("race_id, total");
  return ((plain.data as Omit<ModelRaceEntry, "counts_in_standings">[]) ?? []).map(
    (e) => ({ ...e, counts_in_standings: true }),
  );
}

/** The model's season, over the races of `raceIds` that still count. */
export function modelSeason(entries: ModelRaceEntry[], raceIds: Set<number>) {
  const counted = entries.filter(
    (e) => raceIds.has(e.race_id) && e.total !== null && e.counts_in_standings,
  );
  return {
    races: counted.length,
    points: counted.reduce((sum, e) => sum + Number(e.total), 0),
  };
}
