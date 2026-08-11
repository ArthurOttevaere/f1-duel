import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import type { Driver, SeasonPick } from "@/lib/types";
import { teamColor } from "@/lib/teams";
import SeasonPicksForm from "@/components/SeasonPicksForm";
import { shortName } from "@/lib/format";

export const metadata = { title: "Championship picks" };

export default async function PicksPage() {
  const supabase = await createClient();
  const user = await getUser();

  const [{ data: rosterRows }, pickRes] = await Promise.all([
    supabase
      .from("drivers")
      .select("*")
      .eq("season", CURRENT_SEASON)
      .eq("active", true)
      .order("team"),
    user
      ? supabase
          .from("season_picks")
          .select("*")
          .eq("user_id", user.id)
          .eq("season", CURRENT_SEASON)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const roster = (rosterRows as Driver[]) ?? [];
  const existing = pickRes.data as SeasonPick | null;
  const teams = [...new Set(roster.map((d) => d.team))].map((team) => ({
    team,
    color: teamColor(team, roster),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
        Season {CURRENT_SEASON} · one shot
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">
        Championship picks
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
        Call the Drivers&apos; and Constructors&apos; champions. Locked the
        moment you confirm — no take-backs. The bigger the outsider (and the
        earlier the call), the bigger the season-end bonus. Your profile wears
        your pick&apos;s colors all year.
      </p>

      {!user ? (
        <p className="glass-chip mt-8 rounded-2xl px-5 py-4 text-sm text-ink-mute">
          <Link href="/login" className="text-race underline">
            Sign in
          </Link>{" "}
          to make your picks.
        </p>
      ) : existing ? (
        <div className="glass-card mt-8 p-8">
          <p className="text-sm text-ink-mute">Your picks are locked in:</p>
          <p className="mt-3 text-xl font-semibold">
            🏆 {shortName(existing.champion_driver)}{" "}
            <span className="text-ink-mute">·</span> {existing.champion_team}
          </p>
          <p className="mt-3 text-xs text-ink-mute">
            Locked {new Date(existing.locked_at).toLocaleDateString("en-GB")} —
            settled after the final race.
          </p>
        </div>
      ) : (
        <SeasonPicksForm season={CURRENT_SEASON} roster={roster} teams={teams} />
      )}
    </div>
  );
}
