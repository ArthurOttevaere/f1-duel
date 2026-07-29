import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints } from "@/lib/format";
import type { LeaderboardRow, Race } from "@/lib/types";

export const metadata = { title: "Standings" };
export const revalidate = 120;

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const supabase = await createClient();
  const { league: leagueParam } = await searchParams;

  const [
    { data: rows },
    { data: races },
    { data: entries },
    user,
    { data: leaguesData },
  ] = await Promise.all([
    supabase
      .from("leaderboard")
      .select("*")
      .order("points", { ascending: false }),
    supabase.from("races").select("id, round, name, status").eq("season", CURRENT_SEASON),
    supabase.from("model_entries").select("race_id, total"),
    getUser(),
    // RLS returns only the leagues the viewer belongs to.
    supabase.from("leagues").select("id, name").order("name"),
  ]);

  const myLeagues = (leaguesData as { id: number; name: string }[]) ?? [];
  const selectedLeague =
    myLeagues.find((l) => String(l.id) === leagueParam) ?? null;

  // A league view is the global board filtered to that league's members.
  let memberIds: Set<string> | null = null;
  if (selectedLeague) {
    const { data: members } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", selectedLeague.id);
    memberIds = new Set(
      ((members as { user_id: string }[]) ?? []).map((m) => m.user_id),
    );
  }

  const seasonRaceIds = new Set(((races as Race[]) ?? []).map((r) => r.id));
  const modelTotal = ((entries as { race_id: number; total: number | null }[]) ?? [])
    .filter((e) => seasonRaceIds.has(e.race_id) && e.total !== null)
    .reduce((sum, e) => sum + Number(e.total), 0);

  // Every registered player appears — even before a single race — sorted by
  // points, then name for a stable order among newcomers on 0.
  const board = ((rows as LeaderboardRow[]) ?? [])
    .slice()
    .filter((r) => !memberIds || memberIds.has(r.user_id))
    .sort(
      (a, b) =>
        Number(b.points) - Number(a.points) ||
        a.username.localeCompare(b.username),
    );

  // Insert the model at its rank.
  type Line =
    | { kind: "player"; row: LeaderboardRow }
    | { kind: "model"; points: number };
  const lines: Line[] = board.map((row) => ({ kind: "player", row }));
  const modelIndex = lines.findIndex(
    (l) => l.kind === "player" && l.row.points < modelTotal,
  );
  lines.splice(modelIndex === -1 ? lines.length : modelIndex, 0, {
    kind: "model",
    points: modelTotal,
  });

  const scoredRaces = ((races as Race[]) ?? [])
    .filter((r) => r.status === "scored")
    .sort((a, b) => b.round - a.round);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          Season {CURRENT_SEASON}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Standings</h1>
      </header>

      {myLeagues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/game/standings"
            className={`pressable rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedLeague === null
                ? "bg-race text-white"
                : "glass-chip text-ink-dim hover:text-ink"
            }`}
          >
            Global
          </Link>
          {myLeagues.map((l) => (
            <Link
              key={l.id}
              href={`/game/standings?league=${l.id}`}
              className={`pressable rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedLeague?.id === l.id
                  ? "bg-race text-white"
                  : "glass-chip text-ink-dim hover:text-ink"
              }`}
            >
              {l.name}
            </Link>
          ))}
          <Link
            href="/game/leagues"
            className="pressable glass-chip rounded-full px-4 py-1.5 text-sm text-ink-mute transition-colors hover:text-ink"
          >
            + League
          </Link>
        </div>
      )}

      <section className="glass-card overflow-x-auto p-2">
        <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wider text-ink-mute uppercase">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 text-right font-medium">Races</th>
              <th className="px-3 py-2 text-right font-medium">vs model</th>
              <th className="px-3 py-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) =>
              line.kind === "model" ? (
                <tr key="model" className="border-t border-line bg-race/[0.06]">
                  <td className="px-3 py-2.5 font-mono text-ink-mute">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold tracking-wider">
                    <span className="text-race">THE MODEL</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-ink-mute">—</td>
                  <td className="px-3 py-2.5 text-right text-ink-mute">—</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {formatPoints(line.points)}
                  </td>
                </tr>
              ) : (
                <tr
                  key={line.row.user_id}
                  className={`border-t border-line ${
                    user && line.row.user_id === user.id ? "bg-glass" : ""
                  }`}
                >
                  <td className="px-3 py-2.5 font-mono text-ink-mute">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/profile/${line.row.username}`}
                      className="font-medium hover:underline"
                    >
                      {line.row.username}
                    </Link>
                    {user && line.row.user_id === user.id && (
                      <span className="ml-2 rounded-full bg-race/15 px-2 py-0.5 font-mono text-[0.65rem] text-race">
                        YOU
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-ink-dim">
                    {line.row.races_played}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-dim">
                    {line.row.duel_wins}-{line.row.duel_draws}-{line.row.duel_losses}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {formatPoints(Number(line.row.points))}
                  </td>
                </tr>
              ),
            )}
            {board.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-ink-mute">
                  No duels scored yet — the season table fills in after the
                  first race weekend.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {scoredRaces.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
            RACE BY RACE
          </h2>
          <div className="flex flex-wrap gap-2">
            {scoredRaces.map((r) => (
              <Link
                key={r.id}
                href={`/game/races/${r.round}`}
                className="pressable glass-chip rounded-full px-4 py-1.5 text-sm text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
              >
                R{r.round} · {r.name.replace(" Grand Prix", "")}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
