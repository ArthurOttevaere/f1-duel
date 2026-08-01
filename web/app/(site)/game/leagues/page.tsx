import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatPoints } from "@/lib/format";
import type { LeaderboardRow, League } from "@/lib/types";
import LeagueActions from "@/components/LeagueActions";

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
      const { data: rows } = await supabase.rpc("standings_page", {
        p_league_id: league.id,
        p_limit: LEAGUE_PREVIEW,
        p_offset: 0,
      });
      return { league, rows: (rows as LeaderboardRow[]) ?? [] };
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
        <p className="glass-chip rounded-2xl px-5 py-4 text-sm text-ink-mute">
          You&apos;re not in a league yet. Create one and share the code, or
          paste a code a friend sent you.
        </p>
      ) : (
        leagueBoards.map(({ league, rows }) => (
          <section key={league.id} className="glass-card p-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-semibold">{league.name}</h2>
              <p className="font-mono text-xs text-ink-mute">
                code{" "}
                <span className="rounded-md border border-line bg-black/25 px-2 py-0.5 text-ink select-all">
                  {league.code}
                </span>
              </p>
            </div>
            <ol className="mt-4 flex flex-col gap-1.5">
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
          </section>
        ))
      )}
    </div>
  );
}
