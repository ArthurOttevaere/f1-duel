import { createClient } from "@/lib/supabase/server";
import { formatPoints } from "@/lib/format";
import type { Score } from "@/lib/types";
import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

/**
 * The card for a player's page — the thing that goes in the chat after a good
 * Sunday.
 *
 * The record is counted from `scores` directly rather than read off the
 * leaderboard view: this route only ever needs one player's rows, and it wants
 * to work the same whether or not the viewer is signed in.
 */
export const alt = "An F1 Duel player's season";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// A record that changes every Sunday, read through the cookie-bound client:
// nothing to prerender.
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  const profile = profileRow as { id: string; username: string } | null;
  if (!profile) {
    return shareCard({
      eyebrow: "Player",
      title: "No player by that name",
      subtitle: "The duel is open to anyone, though.",
    });
  }

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("total, beat_model, drew_model")
    .eq("user_id", profile.id);

  const scores = (scoreRows as Pick<
    Score,
    "total" | "beat_model" | "drew_model"
  >[]) ?? [];
  const wins = scores.filter((s) => s.beat_model).length;
  const draws = scores.filter((s) => s.drew_model).length;
  const losses = scores.length - wins - draws;
  const points = scores.reduce((sum, s) => sum + Number(s.total), 0);

  return shareCard({
    eyebrow: "Season 2026",
    title: profile.username,
    subtitle:
      scores.length === 0
        ? "Hasn't taken on the model yet. The next Grand Prix is open."
        : wins > losses
          ? "Ahead of the machine this season."
          : "Racing the machine, one Grand Prix at a time.",
    stats:
      scores.length === 0
        ? [{ value: "0", label: "races" }]
        : [
            { value: `${wins}-${draws}-${losses}`, label: "vs the model" },
            { value: String(scores.length), label: "races" },
            { value: formatPoints(points), label: "points" },
          ],
  });
}
