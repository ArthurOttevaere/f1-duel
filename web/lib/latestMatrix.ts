import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { shortName } from "@/lib/format";
import { driverColor } from "@/lib/teams";
import type { Driver, ModelEntry, Race } from "@/lib/types";
import type { GridDriver } from "@/components/ProbabilityGrid";

/** How many positions of the matrix anyone draws — the ten the game scores. */
export const GRID_POSITIONS = 10;

export interface LatestMatrix {
  race: Race;
  entry: ModelEntry;
  drivers: GridDriver[];
}

/**
 * The most recent race the model has actually played, with its probability
 * matrix. Read in three cheap steps rather than one clever one: a matrix is a
 * fat JSON blob, so only the single entry we are going to draw is fetched.
 *
 * This lived inside `/model`'s page until the home page started drawing a crop
 * of the same matrix (`ProbabilityShot`). Two callers, one query: `cache()`
 * collapses them for the request, the way `nextRace` and `getOwnProfile` do.
 */
export const latestMatrix = cache(async (): Promise<LatestMatrix | null> => {
  const supabase = await createClient();

  const [{ data: raceRows }, { data: entryIds }] = await Promise.all([
    // Only races that are no longer open. This publishes the model's order and
    // its probability matrix, and during a race weekend the highest round with
    // an entry is the race everyone is still playing — it used to print
    // exactly the grid `predictions` and `model_entries` both keep behind the
    // lock. The RLS policy from migration 0009 is what enforces this; the
    // filter is here so no page can quietly start depending on being denied.
    supabase
      .from("races")
      .select("*")
      .eq("season", CURRENT_SEASON)
      .neq("status", "scheduled")
      .order("round", { ascending: false }),
    supabase.from("model_entries").select("race_id"),
  ]);

  const races = (raceRows as Race[]) ?? [];
  const withEntry = new Set(
    ((entryIds as { race_id: number }[]) ?? []).map((e) => e.race_id),
  );
  const race = races.find((r) => withEntry.has(r.id));
  if (!race) return null;

  const [{ data: entryRow }, { data: roster }] = await Promise.all([
    supabase
      .from("model_entries")
      .select("race_id, predicted_order, prob_matrix, pre_quali, locked_at")
      .eq("race_id", race.id)
      .maybeSingle(),
    supabase.from("drivers").select("*").eq("season", race.season),
  ]);

  const entry = entryRow as ModelEntry | null;
  if (!entry?.prob_matrix) return null;

  const byId = new Map(((roster as Driver[]) ?? []).map((d) => [d.driver_id, d]));

  // The model's own order first, then everyone else by how likely a top-10
  // finish was. The grid re-sorts by the selected position, so this is only
  // the tie-break — but it is the right tie-break: two drivers the model gave
  // the same 3% at P7 read better in the order it actually played them.
  const top10 = (t: number[]) => t.slice(0, GRID_POSITIONS).reduce((a, b) => a + b, 0);
  const ranked = Object.entries(entry.prob_matrix)
    .map(([driverId, probs]) => ({ driverId, probs }))
    .sort((a, b) => {
      const ia = entry.predicted_order.indexOf(a.driverId);
      const ib = entry.predicted_order.indexOf(b.driverId);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return top10(b.probs) - top10(a.probs);
    });

  const drivers: GridDriver[] = ranked.map(({ driverId, probs }) => {
    const d = byId.get(driverId);
    return {
      driverId,
      code: d?.code ?? shortName(driverId).slice(0, 3).toUpperCase(),
      name: d?.full_name ?? shortName(driverId),
      // Resolved here because this is the one place that has the roster row
      // the colour is derived from.
      color: driverColor(d),
      probs: probs.slice(0, GRID_POSITIONS),
    };
  });

  return { race, entry, drivers };
});
