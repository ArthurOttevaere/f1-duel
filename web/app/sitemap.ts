import type { MetadataRoute } from "next";
import { CURRENT_SEASON, SITE_URL } from "@/lib/constants";
import { createPublicClient } from "@/lib/supabase/public";
import type { Race } from "@/lib/types";

/** Re-read once an hour: the only thing that moves here is the race list. */
export const revalidate = 3600;

/** The pages that exist whatever the calendar says. */
const STATIC: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/game", priority: 0.9, changeFrequency: "daily" },
  { path: "/game/standings", priority: 0.8, changeFrequency: "weekly" },
  { path: "/model", priority: 0.7, changeFrequency: "weekly" },
  { path: "/rules", priority: 0.6, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
];

/**
 * The sitemap: the marketing surface, plus one entry per Grand Prix that has
 * actually been raced.
 *
 * Two deliberate omissions. **Profiles** are world-readable — they are the
 * standings — but a player's page is theirs to share, not the site's to file
 * with Google. **`/join/<code>`** would put a league's credential in a search
 * index; see `robots.ts`, which disallows it as well.
 *
 * A failed read costs the race pages, not the file: the static half is
 * returned on its own rather than a 500 that leaves the site with no sitemap
 * at all.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("races")
      .select("round, race_at, status")
      .eq("season", CURRENT_SEASON)
      .neq("status", "scheduled")
      .order("round", { ascending: true });

    for (const r of (data as Pick<Race, "round" | "race_at" | "status">[]) ?? []) {
      entries.push({
        url: `${SITE_URL}/game/races/${r.round}`,
        lastModified: r.race_at ? new Date(r.race_at) : now,
        changeFrequency: "yearly",
        priority: 0.5,
      });
    }
  } catch {
    // Leaves the static half standing.
  }

  return entries;
}
