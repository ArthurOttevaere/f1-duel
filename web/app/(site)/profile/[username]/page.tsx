import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints, shortName } from "@/lib/format";
import { countryFlag, countryName } from "@/lib/countries";
import { pickValue, TIER_LABEL } from "@/lib/champions";
import { driverColor, seasonPickColor, teamColor, tint } from "@/lib/teams";
import type {
  Driver,
  PlayerDetails,
  Profile,
  Race,
  Score,
  SeasonPick,
} from "@/lib/types";
import { DriverAvatar } from "@/components/DriverChip";
import DeleteAccount from "@/components/DeleteAccount";
import FormStrip, { type FormEntry } from "@/components/FormStrip";
import PointsCurve, { type CurvePoint } from "@/components/PointsCurve";
import ProfileAvatar from "@/components/ProfileAvatar";
import ProfileEditPanel from "@/components/ProfileEditPanel";
import TeamWordmark from "@/components/TeamWordmark";

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return { title: username };
}

/** "March 2026" — the join date, at the resolution anyone actually cares about. */
function joinedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

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
  const roster = (rosterRows as Driver[]) ?? [];
  const races = new Map(((raceRows as Race[]) ?? []).map((r) => [r.id, r]));
  const byDriverId = new Map(roster.map((d) => [d.driver_id, d]));

  const roundOf = (raceId: number) => races.get(raceId)!.round;

  // Oldest first — the order the form strip and the curve both read in. The
  // duel history below reverses it, because "what happened last time?" is the
  // question that list answers.
  const chrono = ((scoreRows as Score[]) ?? [])
    .filter((s) => races.has(s.race_id))
    .sort((a, b) => roundOf(a.race_id) - roundOf(b.race_id));

  const total =
    chrono.reduce((sum, s) => sum + Number(s.total), 0) +
    Number(pick?.awarded_points ?? 0);
  const wins = chrono.filter((s) => s.beat_model).length;
  const draws = chrono.filter((s) => s.drew_model).length;
  const losses = chrono.length - wins - draws;
  const best = chrono.reduce<Score | null>(
    (acc, s) => (acc === null || s.total > acc.total ? s : acc),
    null,
  );

  const form: FormEntry[] = chrono.slice(-5).map((s) => ({
    round: roundOf(s.race_id),
    race: races.get(s.race_id)!.name,
    outcome: s.beat_model ? "W" : s.drew_model ? "D" : "L",
    points: Number(s.total),
  }));

  // Running totals, race by race. The championship bonus is deliberately not
  // in here: it lands in one lump at season end and would draw a cliff that
  // says nothing about how the season was actually raced.
  const curve: CurvePoint[] = [];
  for (const s of chrono) {
    const previous = curve[curve.length - 1];
    curve.push({
      round: roundOf(s.race_id),
      you: (previous?.you ?? 0) + Number(s.total),
      model: (previous?.model ?? 0) + Number(s.breakdown.model_total ?? 0),
    });
  }

  // Empty string when there's no country on file, or for a visitor.
  const flag = countryFlag(details?.country);

  // Profile themed with the championship pick's team colors (docs §2.3).
  // The colour comes from the pick, never from the site's red: a roster row
  // with no `team_color` used to make every profile look like a Ferrari pick.
  const championDriver = pick ? (byDriverId.get(pick.champion_driver) ?? null) : null;
  const theme = seasonPickColor(pick, roster);
  const driverPaint = championDriver ? driverColor(championDriver, theme) : theme;
  const teamPaint = pick ? teamColor(pick.champion_team, roster, theme) : theme;
  const value = pick ? pickValue(pick) : null;

  const stats: [label: string, value: string][] = [
    ["Season points", formatPoints(total)],
    ["Duel record", `${wins}-${draws}-${losses}`],
    ["Races played", String(chrono.length)],
    ["Best race", best ? formatPoints(Number(best.total)) : "—"],
  ];

  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-24 pb-8 sm:pt-28">
      {/* ── Identity ── */}
      <header className="glass-card overflow-hidden">
        {/* Cover. Everything about it is the pick's colour except the grid. */}
        <div
          className="relative h-32 sm:h-44"
          style={{
            backgroundImage: `
              radial-gradient(42rem 22rem at 18% 130%, ${tint(theme, 0.5)}, transparent 70%),
              radial-gradient(30rem 16rem at 88% -30%, ${tint(theme, 0.28)}, transparent 72%),
              linear-gradient(180deg, ${tint(theme, 0.14)}, transparent)
            `,
          }}
        >
          <div aria-hidden className="cover-grid" />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${theme}, ${tint(theme, 0.15)} 55%, transparent)`,
            }}
          />
        </div>

        <div className="px-5 pb-6 sm:px-8 sm:pb-7">
          {/* The avatar climbs into the cover; the owner's one button sits on
              the same baseline, which is where every profile page puts it. */}
          <div className="flex items-end justify-between gap-4">
            <div className="-mt-16 sm:-mt-20">
              <ProfileAvatar
                driverId={pick?.champion_driver ?? null}
                username={profile.username}
                color={driverPaint}
              />
            </div>
            {isOwner && (
              <ProfileEditPanel
                username={profile.username}
                details={{
                  firstName: details?.first_name ?? "",
                  lastName: details?.last_name ?? "",
                  country: details?.country ?? "",
                  birthYear: details?.birth_year ? String(details.birth_year) : "",
                }}
              />
            )}
          </div>

          <h1 className="display mt-4 flex items-center gap-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {/* Owner-only: `details` is never fetched for a visitor, and the
                country stays out of every public table, so no one else sees
                this flag whatever they ask the page for. */}
            {flag && (
              <span
                title={`${countryName(details?.country)} — only you can see this`}
                aria-label={countryName(details?.country) ?? undefined}
                className="text-3xl leading-none sm:text-4xl"
              >
                {flag}
              </span>
            )}
            {profile.username}
          </h1>

          <p className="mt-2 text-sm text-ink-mute">
            In the paddock since {joinedOn(profile.created_at)}
            {chrono.length > 0 && ` · ${chrono.length} duels raced`}
          </p>

          {pick ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Chip color={driverPaint}>
                {championDriver?.full_name ?? shortName(pick.champion_driver)}
              </Chip>
              <Chip color={teamPaint}>{pick.champion_team}</Chip>
              <span className="text-xs text-ink-mute">
                for the {CURRENT_SEASON} titles
              </span>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-mute">
              No championship picks yet
              {isOwner && (
                <>
                  {" — "}
                  <Link href="/game/picks" className="text-race underline">
                    call the season
                  </Link>
                </>
              )}
              .
            </p>
          )}
        </div>

        {/* Stats band, flush to the edges of the card. */}
        <dl className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {stats.map(([label, figure], i) => (
            <div
              key={label}
              className={`px-5 py-4 sm:px-8 sm:py-5 ${
                i % 2 === 1 ? "border-l border-line" : ""
              } ${i > 1 ? "border-t border-line sm:border-t-0" : ""} ${
                i === 2 ? "sm:border-l" : ""
              }`}
            >
              <dt className="text-xs text-ink-mute">{label}</dt>
              <dd className="mt-1 font-mono text-2xl font-semibold sm:text-3xl">
                {figure}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── The two calls that theme this whole page ── */}
      {pick && value && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
            CHAMPIONSHIP CALL
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className="glass-card flex items-center gap-4 p-5"
              style={{
                backgroundImage: `linear-gradient(100deg, ${tint(driverPaint, 0.13)}, transparent 60%)`,
              }}
            >
              {championDriver ? (
                <DriverAvatar driver={championDriver} size={56} />
              ) : (
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold"
                  style={{ background: tint(driverPaint, 0.2), color: driverPaint }}
                >
                  {shortName(pick.champion_driver).slice(0, 3).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-ink-mute">Drivers&apos; champion</p>
                <p className="truncate text-xl font-semibold">
                  {championDriver?.full_name ?? shortName(pick.champion_driver)}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-mute">
                  {championDriver?.team ?? "Not on this season's grid"}
                </p>
              </div>
            </div>

            <div
              className="glass-card flex flex-col justify-center gap-3 p-5"
              style={{
                backgroundImage: `linear-gradient(100deg, ${tint(teamPaint, 0.13)}, transparent 60%)`,
              }}
            >
              <p className="text-xs text-ink-mute">Constructors&apos; champion</p>
              <TeamWordmark team={pick.champion_team} color={teamPaint} size="lg" />
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink-mute">
            {value.settled ? (
              <>
                Settled:{" "}
                <span className="font-mono text-ink-dim">
                  {formatPoints(value.awarded ?? 0)}
                </span>{" "}
                points banked from the championship call.
              </>
            ) : value.total !== null ? (
              <>
                Worth{" "}
                <span className="font-mono text-ink-dim">
                  up to {formatPoints(value.total)}
                </span>{" "}
                at season end
                {value.driverTier && ` — the driver ${TIER_LABEL[value.driverTier]}`}
                {value.prorate !== null &&
                  `, prorated to ${Math.round(value.prorate * 100)}% of the season`}
                . Locked for good, win or lose.
              </>
            ) : (
              <>
                Locked for good. What it pays is settled at season end, once the
                weekly sync has recorded where these two stood when you called it.
              </>
            )}
          </p>
        </section>
      )}

      {/* ── Form ── */}
      {form.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
            RECENT FORM
          </h2>
          <FormStrip entries={form} />
        </section>
      )}

      {/* ── The season, as a line ── */}
      {curve.length >= 2 && (
        <section className="mt-8">
          <PointsCurve points={curve} color={theme} />
        </section>
      )}

      {/* ── Duel history ── */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
          DUEL HISTORY
        </h2>
        {chrono.length === 0 ? (
          <p className="glass-chip rounded-panel px-5 py-4 text-sm text-ink-mute">
            No scored races yet —{" "}
            <Link href="/game" className="text-race underline">
              enter this weekend&apos;s duel
            </Link>
            .
          </p>
        ) : (
          <ol className="glass-card divide-y divide-line overflow-hidden">
            {[...chrono].reverse().map((s) => {
              const race = races.get(s.race_id)!;
              const outcome = s.beat_model ? "W" : s.drew_model ? "D" : "L";
              return (
                <li key={s.race_id}>
                  <Link
                    href={`/game/races/${race.round}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-glass sm:gap-4 sm:px-5"
                  >
                    <span className="w-8 shrink-0 font-mono text-xs text-ink-mute">
                      R{race.round}
                    </span>
                    <span
                      className={`w-5 shrink-0 text-center font-mono font-bold ${
                        s.beat_model
                          ? "text-emerald-400"
                          : s.drew_model
                            ? "text-amber-300"
                            : "text-race"
                      }`}
                    >
                      {outcome}
                    </span>
                    <span className="flex-1 truncate">{race.name}</span>
                    <span className="hidden font-mono text-xs text-ink-mute sm:inline">
                      vs {formatPoints(Number(s.breakdown.model_total ?? 0))}
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono sm:w-16">
                      {formatPoints(Number(s.total))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── Account (owner only) ── */}
      {/* Two stacked panels — one bordered, one tinted red — for two things
          that are not equals. Signing out is routine and reversible; deleting
          is neither, and it was the only red heading on the page from the
          moment you arrived. They are one section now, in the heading idiom
          the rest of this page uses, and the weight lives where the risk is:
          two hairline rows, both quiet, and the red kept back until the
          delete is actually armed (see DeleteAccount). */}
      {isOwner && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
            ACCOUNT
          </h2>
          <div className="border-b border-line">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-4">
              <p className="text-sm text-ink-mute">
                Signed in as{" "}
                <span className="font-medium text-ink">{profile.username}</span>
              </p>
              {/* The same control as the one in the nav, drawn the same way,
                  because it is the same action. */}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="pressable glass-chip shrink-0 rounded-control px-4 py-1.5 text-sm text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </div>
            <DeleteAccount username={profile.username} />
          </div>
        </section>
      )}
    </main>
  );
}

/** A pill carrying one of the two championship calls, in its own colour. */
function Chip({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-control border px-3.5 py-1.5 text-sm font-medium"
      style={{ borderColor: tint(color, 0.45), background: tint(color, 0.1) }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      {children}
    </span>
  );
}
