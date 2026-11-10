import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";
import { loadRecap, seasonState } from "@/lib/recap";
import { createClient } from "@/lib/supabase/server";

/**
 * The card for a season recap — what the "Share this season" button puts in a
 * chat. Same gate as the page: before the season is settled it is the plain
 * player card's cousin, with no numbers that could still move.
 */
export const alt = "An F1 Duel player's season, replayed";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const state = await seasonState(supabase, CURRENT_SEASON);
  const recap = state.open
    ? await loadRecap(supabase, username, CURRENT_SEASON)
    : null;

  if (!recap) {
    return shareCard({
      eyebrow: `Season ${CURRENT_SEASON}`,
      title: username,
      subtitle: "The season recap opens once the last Grand Prix is settled.",
    });
  }

  return shareCard({
    eyebrow: `Season ${recap.season} · the recap`,
    title: recap.username,
    subtitle:
      recap.won > recap.lost
        ? "Finished the year ahead of the machine."
        : "A full season against the machine, replayed.",
    stats: [
      {
        value: `${recap.won}-${recap.drawn}-${recap.lost}`,
        label: "vs the model",
      },
      ...(recap.rank
        ? [{ value: `P${recap.rank}`, label: `of ${recap.field}` }]
        : []),
      { value: formatPoints(recap.total), label: "points" },
    ],
  });
}
