import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatPoints } from "@/lib/format";
import type { LeaderboardRow, League, Race } from "@/lib/types";
import LeagueSwitcher from "@/components/LeagueSwitcher";
import LeagueCardActions from "@/components/LeagueCardActions";

export const metadata = { title: "Standings" };
export const revalidate = 120;

/** Players per page. Keeps the HTML bounded however many sign up. */
const PER_PAGE = 100;

/** Your own line in a race card: points, and whether you took the model down. */
interface MyRace {
  total: number;
  beat_model: boolean;
  drew_model: boolean;
}

function PageLink({
  page,
  leagueId,
  disabled,
  label,
}: {
  page: number;
  leagueId: number | null;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return <span className="text-ink-mute opacity-40">{label}</span>;
  }
  const params = new URLSearchParams();
  if (leagueId !== null) params.set("league", String(leagueId));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return (
    <Link
      href={`/game/standings${query ? `?${query}` : ""}`}
      className="pressable glass-chip rounded-full px-4 py-1.5 text-ink-dim transition-colors hover:text-ink"
    >
      {label}
    </Link>
  );
}

export default async function StandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { league: leagueParam, page: pageParam } = await searchParams;

  const [{ data: races }, { data: entries }, user, { data: leaguesData }] =
    await Promise.all([
      supabase
        .from("races")
        .select("id, round, name, circuit, status")
        .eq("season", CURRENT_SEASON),
      supabase.from("model_entries").select("race_id, total"),
      getUser(),
      // RLS returns only the leagues the viewer belongs to. The whole row now:
      // the filter needs the name, and the panel under it needs the code and
      // the owner to decide between "Leave" and "Delete league".
      supabase.from("leagues").select("*").order("name"),
    ]);

  const myLeagues = (leaguesData as League[]) ?? [];
  const selectedLeague =
    myLeagues.find((l) => String(l.id) === leagueParam) ?? null;
  const leagueId = selectedLeague?.id ?? null;

  const seasonRaceIds = new Set(((races as Race[]) ?? []).map((r) => r.id));
  const modelTotal = ((entries as { race_id: number; total: number | null }[]) ?? [])
    .filter((e) => seasonRaceIds.has(e.race_id) && e.total !== null)
    .reduce((sum, e) => sum + Number(e.total), 0);

  // Filtering, ordering, counting and ranking all happen in SQL now. Reading
  // the whole board to slice it here stopped working at 1000 players, which is
  // where PostgREST silently truncates — and a league whose members sat below
  // that cut came back empty.
  const [{ data: countData }, { data: rankData }, { data: myScoreRows }] =
    await Promise.all([
      supabase.rpc("standings_count", { p_league_id: leagueId }),
      supabase.rpc("standings_rank_at", {
        p_points: modelTotal,
        p_league_id: leagueId,
      }),
      // At most one row per Grand Prix, so this is a couple of dozen rows —
      // it turns the race list at the bottom into your own season.
      user
        ? supabase
            .from("scores")
            .select("race_id, total, beat_model, drew_model")
            .eq("user_id", user.id)
        : Promise.resolve({ data: null }),
    ]);

  const totalPlayers = Number(countData ?? 0);
  // Players at or above the model's score: the index its line sits at, and one
  // less than the position number printed beside it.
  const modelIndex = Number(rankData ?? 0);

  const totalPages = Math.max(1, Math.ceil((totalPlayers + 1) / PER_PAGE));
  const page = Math.min(
    Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1),
    totalPages,
  );
  const offset = (page - 1) * PER_PAGE;

  // The model occupies a line of its own, so a page that sits after it needs
  // one fewer player to fill the same number of rows.
  const modelOnAnEarlierPage = modelIndex < offset;
  const playerOffset = modelOnAnEarlierPage ? offset - 1 : offset;

  const { data: rows } = await supabase.rpc("standings_page", {
    p_league_id: leagueId,
    p_limit: PER_PAGE,
    p_offset: playerOffset,
  });
  const board = (rows as LeaderboardRow[]) ?? [];

  type Line =
    | { kind: "player"; row: LeaderboardRow; rank: number }
    | { kind: "model"; points: number; rank: number };
  const lines: Line[] = board.map((row, i) => ({
    kind: "player",
    row,
    rank: playerOffset + i + 1,
  }));

  // Splice the model in only on the page it actually falls on.
  if (modelIndex >= offset && modelIndex < offset + PER_PAGE) {
    lines.splice(modelIndex - offset, 0, {
      kind: "model",
      points: modelTotal,
      rank: modelIndex + 1,
    });
  }
  // Ranks after the model's line shift down by one.
  lines.forEach((l, i) => {
    l.rank = offset + i + 1;
  });
  lines.length = Math.min(lines.length, PER_PAGE);

  const scoredRaces = ((races as Race[]) ?? [])
    .filter((r) => r.status === "scored")
    .sort((a, b) => b.round - a.round);

  const myRaces = new Map<number, MyRace>(
    ((myScoreRows as ({ race_id: number } & MyRace)[]) ?? []).map((s) => [
      s.race_id,
      s,
    ]),
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          Season {CURRENT_SEASON}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Standings</h1>
      </header>

      {/* Signed out there is nothing to filter and nothing to administer, so
          the board goes straight in. Signed in, everything below the pills is
          the switcher's to dim while the next league loads. */}
      {user ? (
        <LeagueSwitcher
          leagues={myLeagues.map((l) => ({ id: l.id, name: l.name }))}
          selectedId={leagueId}
        >
          {selectedLeague && (
            <section className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <h2 className="text-lg font-semibold">{selectedLeague.name}</h2>
                <p className="mt-1 font-mono text-xs text-ink-mute">
                  {totalPlayers} {totalPlayers === 1 ? "player" : "players"} ·
                  code{" "}
                  <span className="rounded-md border border-line bg-black/25 px-2 py-0.5 text-ink select-all">
                    {selectedLeague.code}
                  </span>
                </p>
              </div>
              <LeagueCardActions
                leagueId={selectedLeague.id}
                name={selectedLeague.name}
                code={selectedLeague.code}
                isOwner={selectedLeague.owner_id === user.id}
                viewerId={user.id}
              />
            </section>
          )}

          <Board lines={lines} empty={board.length === 0} viewerId={user.id} />

          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} totalPlayers={totalPlayers} leagueId={leagueId} />
          )}
        </LeagueSwitcher>
      ) : (
        <>
          <Board lines={lines} empty={board.length === 0} viewerId={null} />
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} totalPlayers={totalPlayers} leagueId={leagueId} />
          )}
        </>
      )}

      {/* Outside the switcher on purpose: the season's races are the same
          whichever league you are looking at, so they should not blink. */}
      {scoredRaces.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-wide text-ink-dim">
              RACE BY RACE
            </h2>
            {user && (
              <p className="font-mono text-xs text-ink-mute">
                your score · duel result
              </p>
            )}
          </div>

          {/* Was a wrap of identical pills, which at 24 rounds read as one
              undifferentiated heap. One card per race instead: two columns on
              a phone is too tight, three on a desktop keeps a full season to
              a few rows. */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scoredRaces.map((r) => {
              const mine = myRaces.get(r.id);
              return (
                <Link
                  key={r.id}
                  href={`/game/races/${r.round}`}
                  className="pressable glass-chip flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:border-line-hi"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-race/10 font-mono text-xs font-semibold text-race">
                    {String(r.round).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {r.name.replace(" Grand Prix", "")}
                    </span>
                    <span className="block truncate font-mono text-[0.7rem] text-ink-mute">
                      {r.circuit ?? "Grand Prix"}
                    </span>
                  </span>
                  {user && (
                    <span className="flex shrink-0 flex-col items-end leading-tight">
                      <span className="font-mono text-sm">
                        {mine ? formatPoints(Number(mine.total)) : "—"}
                      </span>
                      {mine && (
                        <span
                          className={`font-mono text-[0.6rem] tracking-wider ${
                            mine.beat_model
                              ? "text-race"
                              : mine.drew_model
                                ? "text-ink-dim"
                                : "text-ink-mute"
                          }`}
                        >
                          {mine.beat_model
                            ? "BEAT"
                            : mine.drew_model
                              ? "DREW"
                              : "LOST"}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalPlayers,
  leagueId,
}: {
  page: number;
  totalPages: number;
  totalPlayers: number;
  leagueId: number | null;
}) {
  return (
    <nav className="flex items-center justify-between text-sm">
      <PageLink
        page={page - 1}
        leagueId={leagueId}
        disabled={page === 1}
        label="← Previous"
      />
      <span className="font-mono text-xs text-ink-mute">
        Page {page} of {totalPages} · {totalPlayers} player
        {totalPlayers === 1 ? "" : "s"}
      </span>
      <PageLink
        page={page + 1}
        leagueId={leagueId}
        disabled={page === totalPages}
        label="Next →"
      />
    </nav>
  );
}

function Board({
  lines,
  empty,
  viewerId,
}: {
  lines: (
    | { kind: "player"; row: LeaderboardRow; rank: number }
    | { kind: "model"; points: number; rank: number }
  )[];
  empty: boolean;
  viewerId: string | null;
}) {
  return (
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
          {lines.map((line) =>
            line.kind === "model" ? (
              <tr key="model" className="border-t border-line bg-race/[0.06]">
                <td className="px-3 py-2.5 font-mono text-ink-mute">
                  {line.rank}
                </td>
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
                  line.row.user_id === viewerId ? "bg-glass" : ""
                }`}
              >
                <td className="px-3 py-2.5 font-mono text-ink-mute">
                  {line.rank}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/profile/${line.row.username}`}
                    className="font-medium hover:underline"
                  >
                    {line.row.username}
                  </Link>
                  {line.row.user_id === viewerId && (
                    <span className="ml-2 rounded-full bg-race/15 px-2 py-0.5 font-mono text-[0.65rem] text-race">
                      YOU
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-ink-dim">
                  {line.row.races_played}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-dim">
                  {line.row.duel_wins}-{line.row.duel_draws}-
                  {line.row.duel_losses}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {formatPoints(Number(line.row.points))}
                </td>
              </tr>
            ),
          )}
          {empty && (
            <tr>
              <td colSpan={5} className="px-3 py-10 text-center text-ink-mute">
                No duels scored yet — the season table fills in after the first
                race weekend.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
