import { createClient } from "@/lib/supabase/server";
import type { LeaguePreview } from "@/lib/types";
import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

/**
 * The card for an invite link.
 *
 * This is the one that matters most: leagues are joined by pasting
 * /join/<code> into a group chat, and until now that arrived as a bare URL
 * with no preview at all — the whole growth loop of the game, landing as
 * naked text.
 *
 * It leaks nothing new. `league_by_code()` already answers name, owner and
 * size to anyone holding the code (GAME_DESIGN §2.5) — the card shows exactly
 * that and no more.
 */
export const alt = "You've been invited to an F1 Duel league";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The card reflects live league membership, and the read goes through the
// cookie-bound client, so there is nothing here to prerender.
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("league_by_code", { p_code: code });
  const league = ((data as LeaguePreview[]) ?? [])[0] ?? null;

  if (!league) {
    return shareCard({
      eyebrow: "League invite",
      title: "This invite has expired",
      subtitle:
        "No league matches that link — but the duel is open to anyone.",
    });
  }

  return shareCard({
    eyebrow: "League invite",
    title: league.name,
    subtitle: `${league.owner_username} wants you in their league. Predict the top 10 of every Grand Prix and settle it against the model — and each other.`,
    stats: [
      {
        value: String(league.member_count),
        label: league.member_count === 1 ? "player" : "players",
      },
      { value: "1", label: "duel per race" },
    ],
  });
}
