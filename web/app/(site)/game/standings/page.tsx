import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/constants";
import { formatMargin, formatPoints } from "@/lib/format";
import type { LeaderboardRow, League, Race } from "@/lib/types";
import LeagueSwitcher from "@/components/LeagueSwitcher";
import LeagueCardActions from "@/components/LeagueCardActions";

export const metadata = { title: "Standings" };
export const revalidate = 120;

/** Players per page. Keeps the HTML bounded however many sign up. */
const PER_PAGE = 100;

interface ModelRaceEntry {
  race_id: number;
  total: number | null;
  counts_in_standings: boolean;
}

/**
 * The model's scored races, and whether each one counts towards its season
 * total (migration 0006: the operator can drop past races so the machine
 * doesn't meet new players 400 points up — race pages still show the real
 * score either way).
 *
 * Falls back to counting everything if the column isn't there, because a
 * migration that hasn't been applied yet should cost the board its newest
 * behaviour, not its ability to render.
 */
async function modelEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ModelRaceEntry[]> {
  const flagged = await supabase
    .from("model_entries")
    .select("race_id, total, counts_in_standings");
  if (!flagged.error) return (flagged.data as ModelRaceEntry[]) ?? [];

  const plain = await supabase.from("model_entries").select("race_id, total");
  return ((plain.data as Omit<ModelRaceEntry, "counts_in_standings">[]) ?? []).map(
    (e) => ({ ...e, counts_in_standings: true }),
  );
}

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

  const [{ data: races }, entries, user, { data: leaguesData }] =
    await Promise.all([
      supabase
        .from("races")
        .select("id, round, name, circuit, status")
        .eq("season", CURRENT_SEASON),
      modelEntries(supabase),
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
  const counted = entries.filter(
    (e) =>
      seasonRaceIds.has(e.race_id) && e.total !== null && e.counts_in_standings,
  );
  const modelTotal = counted.reduce((sum, e) => sum + Number(e.total), 0);

  // Filtering, ordering and counting all happen in SQL. Reading the whole
  // board to slice it here stopped working at 1000 players, which is where
  // PostgREST silently truncates — and a league whose members sat below that
  // cut came back empty.
  const [{ data: countData }, { data: myScoreRows }] = await Promise.all([
    supabase.rpc("standings_count", { p_league_id: leagueId }),
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

  const totalPages = Math.max(1, Math.ceil(totalPlayers / PER_PAGE));
  const page = Math.min(
    Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1),
    totalPages,
  );
  const offset = (page - 1) * PER_PAGE;

  // The model is no longer a line in the table — it cannot duel itself, so it
  // has no record and no rank (GAME_DESIGN §2.5). It stands above the board as
  // the bar, which is also what removes the splice this page used to do.
  const { data: rows } = await supabase.rpc("standings_page", {
    p_league_id: leagueId,
    p_limit: PER_PAGE,
    p_offset: offset,
  });
  const board = (rows as LeaderboardRow[]) ?? [];
  const lines = board.map((row, i) => ({ row, rank: offset + i + 1 }));

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
        <h1 className="display mt-1 text-3xl font-extrabold tracking-tight">Standings</h1>
      </header>

      {/* The model stands above the board, not in it — see GAME_DESIGN §2.5.
          Outside the league switcher on purpose: its season is the same
          whichever league you are looking at, so it should not blink. */}
      <ModelBar points={modelTotal} races={counted.length} />

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
                <h2 className="display text-lg font-extrabold tracking-tight">{selectedLeague.name}</h2>
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

const EMPTY_BOARD =
  "No duels scored yet — the season table fills in after the first race weekend.";

/**
 * The model, above the board rather than on it.
 *
 * It used to be a row, and with eleven Grands Prix banked it was the row in
 * P1 — so the first thing a new player saw was a machine winning by 402 points
 * they could never make up. It cannot duel itself, so it has no record and no
 * rank; what it has is a score to clear, every Sunday.
 */
function ModelBar({ points, races }: { points: number; races: number }) {
  const perRace = races > 0 ? points / races : 0;
  return (
    <section className="glass-card flex flex-col gap-3 border-race/25 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          The bar
        </p>
        <p className="mt-1.5 text-sm text-ink-dim">
          The model plays every Grand Prix. Outscore it on Sunday and you take
          the win — that is what the table below counts.
        </p>
      </div>
      <div className="flex shrink-0 gap-6 sm:gap-8">
        <div>
          <p className="font-mono text-2xl font-semibold">
            {races > 0 ? formatPoints(Number(perRace.toFixed(1))) : "—"}
          </p>
          <p className="font-mono text-[0.65rem] tracking-wider text-ink-mute uppercase">
            pts / race
          </p>
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold text-ink-dim">
            {formatPoints(points)}
          </p>
          <p className="font-mono text-[0.65rem] tracking-wider text-ink-mute uppercase">
            over {races} {races === 1 ? "race" : "races"}
          </p>
        </div>
      </div>
    </section>
  );
}

function Board({
  lines,
  empty,
  viewerId,
}: {
  lines: { row: LeaderboardRow; rank: number }[];
  empty: boolean;
  viewerId: string | null;
}) {
  const rows = lines.map(({ row, rank }) => ({
    key: row.user_id,
    rank,
    username: row.username,
    isViewer: row.user_id === viewerId,
    races: row.races_played,
    wins: row.duel_wins,
    record: `${row.duel_wins}-${row.duel_draws}-${row.duel_losses}`,
    margin: Number(row.margin),
    points: Number(row.points),
  }));

  const name = (r: (typeof rows)[number]) => (
    <>
      <Link
        href={`/profile/${r.username}`}
        className="font-medium hover:underline"
      >
        {r.username}
      </Link>
      {r.isViewer && (
        <span className="ml-2 rounded-full bg-race/15 px-2 py-0.5 font-mono text-[0.65rem] text-race">
          YOU
        </span>
      )}
    </>
  );

  // Positive margins are the point of the column, so they get the colour.
  const marginTone = (m: number) =>
    m > 0 ? "text-emerald-400" : m < 0 ? "text-ink-mute" : "text-ink-dim";

  return (
    <>
      {/* ── Phone: one card per player ──────────────────────────────────
          The table below needs 32rem to lay its six columns out and a phone
          hands it 21. Everything past that would sit behind a sideways scroll
          with no visible bar on iOS. Same data, stacked. */}
      <ul className="flex flex-col gap-1.5 sm:hidden">
        {rows.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
              r.isViewer
                ? "border-line-hi bg-glass-strong"
                : "border-line bg-glass"
            }`}
          >
            <span className="w-5 shrink-0 font-mono text-sm text-ink-mute">
              {r.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{name(r)}</span>
              <span className="mt-0.5 block font-mono text-[0.7rem] text-ink-mute">
                {r.races} {r.races === 1 ? "race" : "races"} · {r.record} ·{" "}
                <span className={marginTone(r.margin)}>
                  {formatMargin(r.margin)}
                </span>
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-base">{r.wins}</span>
              <span className="block font-mono text-[0.6rem] tracking-wider text-ink-mute uppercase">
                {r.wins === 1 ? "win" : "wins"}
              </span>
            </span>
          </li>
        ))}
        {empty && (
          <li className="rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute">
            {EMPTY_BOARD}
          </li>
        )}
      </ul>

      {/* ── Tablet and up: the full table ── */}
      <section className="glass-card hidden overflow-x-auto p-2 sm:block">
        <table className="w-full min-w-[32rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left font-mono text-xs tracking-wider text-ink-mute uppercase">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-3 py-2 text-right font-medium">Wins</th>
              <th className="px-3 py-2 text-right font-medium">W-D-L</th>
              <th className="px-3 py-2 text-right font-medium">Margin</th>
              <th className="px-3 py-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                className={`border-t border-line ${r.isViewer ? "bg-glass" : ""}`}
              >
                <td className="px-3 py-2.5 font-mono text-ink-mute">{r.rank}</td>
                <td className="px-3 py-2.5">
                  {name(r)}
                  <span className="ml-2 font-mono text-xs text-ink-mute">
                    {r.races} {r.races === 1 ? "race" : "races"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold">
                  {r.wins}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-dim">
                  {r.record}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-mono ${marginTone(r.margin)}`}
                >
                  {formatMargin(r.margin)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-ink-dim">
                  {formatPoints(r.points)}
                </td>
              </tr>
            ))}
            {empty && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-ink-mute">
                  {EMPTY_BOARD}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
