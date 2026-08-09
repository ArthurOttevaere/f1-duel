import { driverPhoto, shortName } from "@/lib/format";
import type {
  Driver,
  ModelEntry,
  Prediction,
  Race,
  RaceResult,
  Score,
  SlotScore,
} from "@/lib/types";
import type {
  PosterCall,
  PosterData,
  PosterDriver,
  PosterSlot,
  PosterStats,
  SlotKind,
} from "@/lib/poster/types";

function statsFor(slots: SlotScore[] | undefined): PosterStats {
  const kinds = (slots ?? []).map((s) => s.kind);
  const misses = (slots ?? [])
    .filter((s) => s.actual != null)
    .map((s) => Math.abs(s.position - (s.actual as number)));

  return {
    exact: kinds.filter((k) => k === "exact").length,
    near: kinds.filter((k) => k === "near").length,
    inTop10: kinds.filter((k) => k !== "miss").length,
    avgMiss: misses.length
      ? misses.reduce((a, b) => a + b, 0) / misses.length
      : null,
  };
}

/**
 * Assembles everything the poster draws from the rows the review page already
 * loaded. Returns null only when there is no official classification to print —
 * a race you never picked still exports, as the result plus the model's race,
 * so the button doesn't come and go depending on whether you played.
 *
 * Only the drivers that actually appear on the poster are carried over: this
 * object is serialized into the page's HTML, and the full roster would be most
 * of its weight for no gain.
 */
export function buildPosterData({
  race,
  drivers,
  prediction,
  score,
  entry,
  result,
  player,
}: {
  race: Race;
  drivers: Map<string, Driver>;
  prediction: Prediction | undefined;
  score: Score | undefined;
  entry: ModelEntry | null;
  result: RaceResult | null;
  player: string;
}): PosterData | null {
  if (!result) return null;
  // A prediction without a score (or the other way round) is a race mid-scoring:
  // treat it as unplayed rather than drawing half a duel.
  const played = Boolean(prediction && score);

  const actualOrder: (string | null)[] = Array.from({ length: 10 }, (_, i) => {
    const hit = Object.entries(result.classification).find(([, p]) => p === i + 1);
    return hit?.[0] ?? null;
  });

  const slots: PosterSlot[] = Array.from({ length: 10 }, (_, i) => {
    const mine = played ? score?.breakdown.slots[i] : undefined;
    const model = entry?.breakdown?.slots?.[i];
    return {
      position: i + 1,
      mine: (played ? prediction?.picks[i] : null) ?? null,
      official: actualOrder[i],
      model: entry?.predicted_order[i] ?? null,
      kind: (mine?.kind as SlotKind | undefined) ?? null,
      modelKind: (model?.kind as SlotKind | undefined) ?? null,
      points: mine?.points ?? 0,
      multiplier: mine?.multiplier ?? 1,
      modelPoints: model?.points ?? 0,
      modelMultiplier: model?.multiplier ?? 1,
    };
  });

  const used = new Set<string>();
  for (const s of slots) {
    for (const id of [s.mine, s.official, s.model]) if (id) used.add(id);
  }
  if (result.dotd) used.add(result.dotd);
  if (played && prediction?.dotd) used.add(prediction.dotd);

  const roster: Record<string, PosterDriver> = {};
  for (const id of used) {
    const d = drivers.get(id);
    roster[id] = {
      code: d?.code ?? shortName(id).slice(0, 3).toUpperCase(),
      name: shortName(id),
      team: d?.team ?? "",
      color: d?.team_color ?? "#6c7280",
      // Always offered, never guaranteed: rookies mid-season have no portrait
      // yet, and the drawing falls back to the code when the file 404s. A
      // hardcoded list of who has a photo would go stale on the next signing.
      photo: driverPhoto(id),
    };
  }

  const myDotd = played ? prediction?.dotd : null;
  const dotd: PosterCall | null = result.dotd
    ? {
        actual: roster[result.dotd]?.name ?? shortName(result.dotd),
        mine: myDotd ? (roster[myDotd]?.name ?? shortName(myDotd)) : null,
        hit: myDotd === result.dotd,
        // The model never calls a Driver of the Day.
        model: null,
        modelHit: false,
      }
    : null;

  const myScBet = played ? (prediction?.sc_bet ?? null) : null;
  const safetyCar: PosterCall | null =
    result.safety_car === null
      ? null
      : {
          actual: result.safety_car ? "Yes" : "No",
          mine: myScBet === null ? null : myScBet ? "Yes" : "No",
          hit: myScBet === result.safety_car,
          model: entry?.sc_bet == null ? null : entry.sc_bet ? "Yes" : "No",
          modelHit: entry?.sc_bet === result.safety_car,
        };

  return {
    season: race.season,
    round: race.round,
    raceName: race.name,
    circuit: race.circuit,
    country: race.country,
    raceAt: race.race_at,
    player,
    total: played ? (score?.total ?? null) : null,
    modelTotal: entry?.total ?? null,
    verdict:
      !played || !score
        ? null
        : score.beat_model
          ? "beat"
          : score.drew_model
            ? "drew"
            : "lost",
    duelBonus: (played && score?.breakdown.bonuses?.duel) || 0,
    slots,
    stats: played && score ? statsFor(score.breakdown.slots) : null,
    modelStats: entry?.breakdown?.slots ? statsFor(entry.breakdown.slots) : null,
    dotd,
    safetyCar,
    drivers: roster,
  };
}
