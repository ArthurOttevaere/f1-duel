import { ConstructorsTable, DriversTable } from "@/components/f1/ChampionshipTables";
import TitleFight from "@/components/f1/TitleFight";
import Unreachable from "@/components/f1/Unreachable";
import { CURRENT_SEASON } from "@/lib/constants";
import { getCalendar, getStandings, publishedRounds } from "@/lib/f1/season";
import { titleFight } from "@/lib/f1/titleFight";
import type { Standings, Weekend } from "@/lib/f1/types";

export const metadata = {
  title: `F1 ${CURRENT_SEASON} championship`,
  description: `The ${CURRENT_SEASON} Formula 1 drivers' and constructors' championships, and who can still win the title.`,
};

/**
 * Championship — the sport's two tables, and the fight at the top of one.
 *
 * Deliberately not called "Standings": that is the game's board, one tab
 * away in the main nav, and the whole reason this section exists apart from
 * it. The title fight leads because it is the question a table cannot answer
 * at a glance — who is still *in* it.
 */
export default async function ChampionshipPage() {
  let calendar: Weekend[];
  let standings: Standings | null;
  try {
    [calendar, standings] = await Promise.all([
      getCalendar(CURRENT_SEASON),
      getStandings(CURRENT_SEASON),
    ]);
  } catch {
    return <Unreachable what="the championship" />;
  }

  if (!standings) {
    return (
      <>
        <h1 className="display mt-12 text-4xl font-extrabold tracking-tight sm:text-5xl">
          Championship
        </h1>
        <p className="mt-10 rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute">
          The tables open after the first Grand Prix of {CURRENT_SEASON}.
        </p>
      </>
    );
  }

  // Which rounds the table already holds. Without them the fight cannot be
  // counted safely, so it is left out rather than guessed.
  const published = await publishedRounds(CURRENT_SEASON).catch(() => null);
  const fight = published ? titleFight(standings, calendar, published) : null;
  const after = calendar.find((w) => w.round === standings.round);

  return (
    <>
      <section className="mt-12">
        <h1 className="display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Championship
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-dim">
          After round {standings.round} of {calendar.length}
          {after ? `, the ${after.name}` : ""}. The official points — nothing
          here comes from the game.
        </p>
      </section>

      {fight && <TitleFight fight={fight} />}

      <div className="mt-16 grid gap-x-12 gap-y-16 border-t border-line pt-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <h2 className="mb-4 font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
            Drivers
          </h2>
          <DriversTable
            rows={standings.drivers}
            inContention={
              fight && !fight.over
                ? new Set(fight.contenders.map((c) => c.standing.driver.id))
                : null
            }
          />
        </section>
        <section>
          <h2 className="mb-4 font-mono text-xs tracking-[0.2em] text-ink-dim uppercase">
            Constructors
          </h2>
          <ConstructorsTable rows={standings.constructors} />
        </section>
      </div>
    </>
  );
}
