import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatPoints } from "@/lib/format";
import type { LeaderboardRow, League } from "@/lib/types";
import LeagueActions from "@/components/LeagueActions";
import LeagueCardActions from "@/components/LeagueCardActions";

export const metadata = { title: "Leagues" };

/** Rows shown per league card; the full board lives on /game/standings. */
const LEAGUE_PREVIEW = 50;

export default async function LeaguesPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    return (
      <div className="glass-card mx-auto max-w-lg p-10 text-center">
        <h1 className="text-xl font-bold">Leagues</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Private leaderboards for you and your friends.{" "}
          <Link href="/login" className="text-race underline">
            Sign in
          </Link>{" "}
          to create or join one.
        </p>
      </div>
    );
  }

  // RLS: only leagues the user belongs to are visible.
  const { data: leagueRows } = await supabase.from("leagues").select("*");
  const leagues = (leagueRows as League[]) ?? [];

  // One call per league instead of two, and the member list never travels in
  // the URL: `?user_id=in.(<uuid>,…)` blew past the request-line limit at
  // roughly 200 members, and the leaderboard read was capped at 1000 rows.
  const leagueBoards = await Promise.all(
    leagues.map(async (league) => {
      const [{ data: rows }, { count }] = await Promise.all([
        supabase.rpc("standings_page", {
          p_league_id: league.id,
          p_limit: LEAGUE_PREVIEW,
          p_offset: 0,
        }),
        // Counted rather than derived from the preview, which stops at 50.
        supabase
          .from("league_members")
          .select("user_id", { count: "exact", head: true })
          .eq("league_id", league.id),
      ]);
      return {
        league,
        rows: (rows as LeaderboardRow[]) ?? [],
        members: count ?? 0,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
            Friends &amp; rivals
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Leagues</h1>
        </div>
        <LeagueActions />
      </header>

      {leagueBoards.length === 0 ? (
        // The empty state is the whole feature for a new player: say what a
        // league is, then put both doors right there.
        <section className="glass-card flex flex-col items-start gap-4 p-6 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">
              You&apos;re not in a league yet
            </h2>
            <p className="mt-2 max-w-prose text-sm text-ink-dim">
              A league is a private board scored exactly like the global one —
              you just see your friends instead of everyone. Create one and
              send the invite link, or paste the link a friend sent you.
            </p>
          </div>
          <LeagueActions />
          <Link
            href="/game/standings"
            className="text-sm text-ink-mute underline transition-colors hover:text-ink"
          >
            Meanwhile, the global standings →
          </Link>
        </section>
      ) : (
        leagueBoards.map(({ league, rows, members }) => (
          <section key={league.id} className="glass-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{league.name}</h2>
                <p className="mt-1 font-mono text-xs text-ink-mute">
                  {members} {members === 1 ? "player" : "players"} · code{" "}
                  <span className="rounded-md border border-line bg-black/25 px-2 py-0.5 text-ink select-all">
                    {league.code}
                  </span>
                </p>
              </div>
              <LeagueCardActions
                leagueId={league.id}
                name={league.name}
                code={league.code}
                isOwner={league.owner_id === user.id}
                viewerId={user.id}
              />
            </div>

            <ol className="mt-5 flex flex-col gap-1.5">
              {rows.map((row, i) => (
                <li
                  key={row.user_id}
                  className={`flex items-center gap-3 rounded-xl border border-line bg-glass px-4 py-2 text-sm ${
                    row.user_id === user.id ? "border-line-hi" : ""
                  }`}
                >
                  <span className="w-6 font-mono text-ink-mute">{i + 1}</span>
                  <Link
                    href={`/profile/${row.username}`}
                    className="flex-1 font-medium hover:underline"
                  >
                    {row.username}
                  </Link>
                  <span className="font-mono text-xs text-ink-dim">
                    {row.duel_wins}-{row.duel_draws}-{row.duel_losses}
                  </span>
                  <span className="w-16 text-right font-mono">
                    {formatPoints(Number(row.points))}
                  </span>
                </li>
              ))}
            </ol>

            {members > rows.length && (
              <Link
                href={`/game/standings?league=${league.id}`}
                className="mt-4 inline-block text-sm text-ink-mute underline transition-colors hover:text-ink"
              >
                Full board ({members} players) →
              </Link>
            )}
          </section>
        ))
      )}
    </div>
  );
}
