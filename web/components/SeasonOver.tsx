import Link from "next/link";
import Arrow from "@/components/Arrow";
import Countdown from "@/components/Countdown";
import { formatMargin, formatPoints, formatRaceDate } from "@/lib/format";

export interface SeasonOverProps {
  season: number;
  /** Grands Prix scored this season. Zero means the calendar, not the season, is empty. */
  racesScored: number;
  /** The model's season, over the races that count (`lib/model.ts`). */
  model: { races: number; points: number } | null;
  /** Top of the season table. Empty before anybody has scored. */
  podium: {
    username: string;
    duel_wins: number;
    duel_draws: number;
    duel_losses: number;
    points: number;
    margin: number;
  }[];
  /** The viewer's own season, when they played one. */
  mine: {
    username: string | null;
    won: number;
    drawn: number;
    lost: number;
    points: number;
  } | null;
  /** The next Grand Prix on the calendar, whatever season it belongs to. */
  nextRace: { name: string; race_at: string | null; season: number } | null;
}

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-1 border-t border-line py-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] sm:py-5">
      <dt className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-ink-dim">{children}</dd>
    </div>
  );
}

/** A duel record, in the site's own W/D/L tones (§3.2). */
function Record({ won, drawn, lost }: { won: number; drawn: number; lost: number }) {
  return (
    <span className="font-mono font-semibold tabular-nums">
      <span className="text-emerald-400">{won}</span>
      <span className="text-ink-mute">–</span>
      <span className="text-amber-300">{drawn}</span>
      <span className="text-ink-mute">–</span>
      <span className="text-race">{lost}</span>
    </span>
  );
}

/**
 * What `/game` shows when there is no Grand Prix to play.
 *
 * It used to be the default empty state — a centred card, a title, one grey
 * sentence, a red underlined link — which says *there is nothing here*. At the
 * one moment it appears, that is the opposite of the truth: the season has
 * just ended, there is a champion, the model has a final total, and the
 * viewer has a record against it. So the screen is the end of the season, not
 * the absence of a race.
 *
 * It is deliberately **not** the season recap of `GAME_DESIGN` §2.3 — that one
 * is a surface of its own, with the championship picks paying out. This is the
 * page you land on, stating the table's last word and pointing at the rest.
 *
 * With nothing scored at all the same frame says the honest thing instead: the
 * calendar has not been synced. Never "the season is over" when the truth is
 * "no data".
 */
export default function SeasonOver({
  season,
  racesScored,
  model,
  podium,
  mine,
  nextRace,
}: SeasonOverProps) {
  const champion = podium[0] ?? null;
  const over = racesScored > 0;

  return (
    <div className="flex flex-col">
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
        {over ? `Season ${season} · complete` : `Season ${season}`}
      </p>
      <h1 className="display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
        {over ? "That's the season." : "No Grand Prix on the calendar"}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-dim">
        {over ? (
          <>
            {racesScored} {racesScored === 1 ? "Grand Prix" : "Grands Prix"},
            one model, and the table is closed.
          </>
        ) : (
          <>
            The {season}{" "}calendar hasn&apos;t been synced yet — no race
            to enter, and nothing scored. Everything else on the site still
            works.
          </>
        )}
      </p>

      {over && (
        <dl className="mt-10 border-b border-line">
          {mine && (
            <Line label="Your season">
              <Record won={mine.won} drawn={mine.drawn} lost={mine.lost} /> against
              the model over {mine.won + mine.drawn + mine.lost}{" "}
              {mine.won + mine.drawn + mine.lost === 1 ? "duel" : "duels"}, for{" "}
              <span className="font-mono text-ink tabular-nums">
                {formatPoints(mine.points)}
              </span>{" "}
              points.
            </Line>
          )}
          {champion && (
            <Line label="Champion">
              <span className="text-ink">{champion.username}</span> —{" "}
              <span className="font-mono tabular-nums">
                {champion.duel_wins}
              </span>{" "}
              {champion.duel_wins === 1 ? "win" : "wins"} over the model, margin{" "}
              <span className="font-mono text-ink tabular-nums">
                {formatMargin(champion.margin)}
              </span>
              .
            </Line>
          )}
          {model && model.races > 0 && (
            <Line label="The model">
              Finished on{" "}
              <span className="font-mono text-ink tabular-nums">
                {formatPoints(model.points)}
              </span>{" "}
              points across {model.races}{" "}
              {model.races === 1 ? "race" : "races"} — the bar everybody was
              measured against.
            </Line>
          )}
        </dl>
      )}

      {/* The next lights, when the calendar already has them. Between seasons
          this is the only forward-looking thing on the page, so it gets the
          clock rather than a sentence. No rule above it: the spec sheet's own
          `border-b` closes two rows higher, and two hairlines a centimetre
          apart read as a mistake. */}
      {nextRace?.race_at && (
        <div className="mt-10">
          <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
            Next lights · season {nextRace.season}
          </p>
          <p className="display mt-2 text-xl font-extrabold tracking-tight">
            {nextRace.name}
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            {formatRaceDate(nextRace.race_at)}
          </p>
          <Countdown
            to={nextRace.race_at}
            label="Lights out in"
            className="mt-3"
          />
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/game/standings"
          className="pressable btn-race px-7 py-3 text-sm font-semibold"
        >
          {over ? "Final standings" : "Standings"}
        </Link>
        {mine?.username && (
          <Link
            href={`/profile/${mine.username}`}
            className="pressable group inline-flex items-center gap-2 rounded-control border border-line-hi px-6 py-3 text-sm font-semibold transition-colors hover:bg-glass-strong"
          >
            Your season in full
            <Arrow />
          </Link>
        )}
      </div>
    </div>
  );
}
