import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints, shortName } from "@/lib/format";
import type {
  Driver,
  PlayerDetails,
  Profile,
  Race,
  Score,
  SeasonPick,
} from "@/lib/types";
import UsernameEditor from "@/components/UsernameEditor";
import PlayerDetailsEditor from "@/components/PlayerDetailsEditor";

export const revalidate = 120;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  const profile = profileRow as Profile | null;
  if (!profile) notFound();

  const viewer = await getUser();
  const isOwner = viewer?.id === profile.id;

  const [{ data: pickRow }, { data: scoreRows }, { data: raceRows }, { data: rosterRows }] =
    await Promise.all([
      supabase
        .from("season_picks")
        .select("*")
        .eq("user_id", profile.id)
        .eq("season", CURRENT_SEASON)
        .maybeSingle(),
      supabase.from("scores").select("*").eq("user_id", profile.id),
      supabase.from("races").select("*").eq("season", CURRENT_SEASON),
      supabase.from("drivers").select("*").eq("season", CURRENT_SEASON),
    ]);

  // Only fetched for the owner: RLS would hand a visitor nothing anyway, so
  // the round-trip is pure waste on someone else's profile.
  const details = isOwner
    ? ((
        await supabase
          .from("player_details")
          .select("*")
          .eq("id", profile.id)
          .maybeSingle()
      ).data as PlayerDetails | null)
    : null;

  const pick = pickRow as SeasonPick | null;
  const races = new Map(((raceRows as Race[]) ?? []).map((r) => [r.id, r]));
  const roster = new Map(
    ((rosterRows as Driver[]) ?? []).map((d) => [d.driver_id, d]),
  );

  const scores = ((scoreRows as Score[]) ?? [])
    .filter((s) => races.has(s.race_id))
    .sort((a, b) => (races.get(b.race_id)!.round - races.get(a.race_id)!.round));

  const total = scores.reduce((sum, s) => sum + Number(s.total), 0)
    + Number(pick?.awarded_points ?? 0);
  const wins = scores.filter((s) => s.beat_model).length;
  const draws = scores.filter((s) => s.drew_model).length;
  const losses = scores.length - wins - draws;
  const best = scores.reduce<Score | null>(
    (acc, s) => (acc === null || s.total > acc.total ? s : acc),
    null,
  );

  // Profile themed with the championship pick's team colors (docs §2.3).
  const championDriver = pick ? roster.get(pick.champion_driver) : null;
  const theme = championDriver?.team_color ?? "#ff1e3c";

  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
        {/* ── Identity ── */}
        <header
          className="glass-card relative overflow-hidden p-8"
          style={{
            backgroundImage: `radial-gradient(60rem 18rem at 20% -40%, ${theme}2e, transparent 70%)`,
          }}
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: `linear-gradient(90deg, ${theme}, transparent 70%)` }}
          />
          {isOwner && (
            <form
              action="/auth/signout"
              method="post"
              className="absolute right-6 top-6"
            >
              <button
                type="submit"
                className="pressable glass-chip rounded-full px-4 py-1.5 text-sm text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
              >
                Sign out
              </button>
            </form>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{profile.username}</h1>
          {isOwner && <UsernameEditor username={profile.username} />}
          {pick ? (
            <p className="mt-2 text-sm text-ink-dim">
              Backing{" "}
              <span className="font-medium" style={{ color: theme }}>
                {championDriver ? shortName(pick.champion_driver) : pick.champion_driver}
              </span>{" "}
              and <span className="font-medium">{pick.champion_team}</span> for
              the {CURRENT_SEASON} titles
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-mute">
              No championship picks yet.
            </p>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              ["Season points", formatPoints(total)],
              ["Duel record", `${wins}-${draws}-${losses}`],
              ["Races played", String(scores.length)],
              ["Best race", best ? formatPoints(best.total) : "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-ink-mute">{label}</dt>
                <dd className="mt-1 font-mono text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* ── Personal details (owner only) ── */}
        {isOwner && (
          <PlayerDetailsEditor
            initial={{
              firstName: details?.first_name ?? "",
              lastName: details?.last_name ?? "",
              country: details?.country ?? "",
              birthYear: details?.birth_year ? String(details.birth_year) : "",
            }}
          />
        )}

        {/* ── Duel history ── */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
            DUEL HISTORY
          </h2>
          {scores.length === 0 ? (
            <p className="glass-chip rounded-2xl px-5 py-4 text-sm text-ink-mute">
              No scored races yet —{" "}
              <Link href="/game" className="text-race underline">
                enter this weekend&apos;s duel
              </Link>
              .
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {scores.map((s) => {
                const race = races.get(s.race_id)!;
                const outcome = s.beat_model ? "W" : s.drew_model ? "D" : "L";
                return (
                  <li key={s.race_id}>
                    <Link
                      href={`/game/races/${race.round}`}
                      className="pressable flex items-center gap-4 rounded-xl border border-line bg-glass px-4 py-2.5 text-sm transition-colors hover:border-line-hi"
                    >
                      <span
                        className={`w-5 text-center font-mono font-bold ${
                          s.beat_model
                            ? "text-emerald-400"
                            : s.drew_model
                              ? "text-amber-300"
                              : "text-race"
                        }`}
                      >
                        {outcome}
                      </span>
                      <span className="flex-1">{race.name}</span>
                      <span className="font-mono text-xs text-ink-mute">
                        vs {formatPoints(Number(s.breakdown.model_total ?? 0))}
                      </span>
                      <span className="w-16 text-right font-mono">
                        {formatPoints(Number(s.total))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
    </main>
  );
}
