import { notFound, redirect } from "next/navigation";
import SeasonStory from "@/components/SeasonStory";
import { CURRENT_SEASON } from "@/lib/constants";
import { loadRecap, seasonState } from "@/lib/recap";
import { createClient } from "@/lib/supabase/server";

/**
 * A player's season recap (`docs/GAME_DESIGN.md` §2.3).
 *
 * Public, like the profile it hangs off, and it **does not exist** until the
 * season is over and `settle_season.py` has paid the championship calls
 * (`lib/recap.ts#seasonState`): before that the address sends you back to the
 * profile, and nothing on the site links here. It is an event, not a
 * dashboard — a recap that opens in round 21 with three races missing is a
 * worse profile page.
 *
 * `?preview=1` narrates the season so far. Development only: on production
 * the parameter is ignored, so the gate cannot be argued with from a URL.
 */
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return {
    title: `${username}'s ${CURRENT_SEASON}`,
    description: `${username}'s ${CURRENT_SEASON} season against the model, replayed.`,
  };
}

export default async function SeasonRecapPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ username }, { preview }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const previewing =
    preview === "1" && process.env.NODE_ENV !== "production";

  const state = await seasonState(supabase, CURRENT_SEASON);
  if (!state.open && !previewing) redirect(`/profile/${username}`);

  const recap = await loadRecap(supabase, username, CURRENT_SEASON);
  // No such player is a 404; a player who never raced has a profile and no
  // story, so that is where they go.
  if (!recap) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (!data) notFound();
    redirect(`/profile/${username}`);
  }

  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-24 pb-8 sm:pt-28">
      <SeasonStory recap={recap} preview={!state.open} />
    </main>
  );
}
