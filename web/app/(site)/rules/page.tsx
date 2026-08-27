import Link from "next/link";
import RulesIndex from "@/components/RulesIndex";
import RarityScale from "@/components/RarityScale";

export const metadata = {
  title: "Rules",
  description:
    "The F1 Duel manual: how the weekly duel, rarity-weighted scoring, bonuses, safety-car bet, championship picks and standings work.",
};

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-2.5 text-sm first:border-t-0">
      <span className="text-ink-dim">{left}</span>
      <span className="shrink-0 font-mono font-semibold">{right}</span>
    </div>
  );
}

const SECTIONS = [
  { id: "duel", label: "The weekly duel" },
  { id: "scoring", label: "Scoring" },
  { id: "rarity", label: "Rarity multiplier" },
  { id: "bonuses", label: "Bonuses" },
  { id: "safety-car", label: "Safety-car bet" },
  { id: "dotd", label: "Driver of the Day" },
  { id: "champions", label: "Championship picks" },
  { id: "standings", label: "Standings & leagues" },
];

export default function RulesPage() {
  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          The manual
        </p>
        <h1 className="display mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          How F1 Duel works
        </h1>
        {/* R-3: this line used to end "Everything you need to know is below",
            which tells the reader something the scrollbar already has. What
            somebody wants before a long page is the price and the payoff —
            how long it takes, and the one section that decides the game. */}
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-dim">
          Eight sections, about ten minutes. Two of them are the game: what a
          call is worth, and the multiplier in{" "}
          <a href="#rarity" className="text-ink underline-offset-4 hover:underline">
            03
          </a>{" "}
          that decides most weekends.
        </p>

        {/* R-1: the index was eight capsules wrapping under the title — a heap
            that says neither how long the page is nor where you are in it. It
            is the page's spine now: a numbered list, sticky beside the reading
            column from `lg` up. See RulesIndex. */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
          <RulesIndex
            sections={SECTIONS}
            className="lg:sticky lg:top-28 lg:self-start"
          />

          <div className="flex flex-col gap-14">
            {/* Duel */}
            <section id="duel" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  01
                </span>
                The weekly duel
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
                <p>
                  Every race weekend you submit an ordered{" "}
                  <strong className="text-ink">top 10</strong> for the Grand Prix.
                  You can edit it freely until{" "}
                  <strong className="text-ink">lights out on Sunday</strong>, when
                  predictions lock.
                </p>
                <p>
                  The model submits its own top 10 after qualifying. After the
                  race, both are scored with the exact same formula against the
                  official classification. One duel per Grand Prix, all season
                  long — nobody can see your picks until the race locks.
                </p>
              </div>
            </section>

            {/* Scoring */}
            <section id="scoring" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  02
                </span>
                Scoring your top 10
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-dim">
                Each of your 10 slots is compared with where the driver actually
                finished:
              </p>
              <div className="glass-card mt-5 p-6">
                <Row left="Driver at the exact position you called" right="10 pts" />
                <Row left="Driver one position off (±1)" right="5 pts" />
                <Row left="Driver anywhere else in the top 10" right="2 pts" />
                <Row left="Driver outside the top 10 / DNF" right="0 pts" />
              </div>
            </section>

            {/* Rarity */}
            <section id="rarity" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  03
                </span>
                Rarity multiplier — boldness pays
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-dim">
                The heart of the game. Every{" "}
                <strong className="text-ink">exact-position</strong> hit is
                multiplied by how <em>unlikely</em> the model thought it was. Call
                a P8 the model expected and you get ×1; nail an upset it rated a
                long shot and you multiply up to ×3. The model plays the
                favourites, so it almost never triggers these — this is your edge.
              </p>
              {/* R-2: four table rows saying "≥ 30% → ×1" for the mechanic the
                  whole game turns on — while the picture of it already existed
                  one page away. These are the bands of the matrix on /model
                  (lib/bands.ts), so the rule and the chart are now literally the
                  same object. See RarityScale. */}
              <RarityScale className="mt-6" />
            </section>

            {/* Bonuses */}
            <section id="bonuses" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  04
                </span>Bonuses</h2>
              <div className="glass-card mt-5 p-6">
                <Row left="Exact podium — P1, P2, P3 all spot on" right="+15" />
                <Row left="Perfect top 10 — all ten exact" right="+100" />
                <Row left="Correct Driver of the Day" right="+5" />
                <Row left="Correct safety-car bet" right="+8" />
              </div>
              <p className="mt-4 text-xs text-ink-mute">
                A typical solid weekend lands around 40–70 pts; a bold, accurate
                one can clear 130+. Beating the model pays no points — it wins you
                the Grand Prix, which is what the season table counts.
              </p>
            </section>

            {/* Safety car */}
            <section id="safety-car" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  05
                </span>
                Safety-car bet
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
                <p>
                  Alongside your top 10 you can bet{" "}
                  <strong className="text-ink">Yes/No</strong> on whether a safety
                  car — full <em>or</em>{" "}
                  virtual (VSC) — will be deployed during the race. Call it right and it&apos;s{" "}
                  <strong className="text-ink">+8 pts</strong>.
                </p>
                <p>
                  Unlike Driver of the Day,{" "}
                  <strong className="text-ink">the model bets too</strong>: it
                  plays the circuit&apos;s historical safety-car rate (street
                  circuits nearly always, smooth permanent tracks less so). Beat it
                  by reading the specific weekend — weather, a tense grid, rookies
                  on the pace. The outcome is read automatically from the official
                  race-control messages.
                </p>
              </div>
            </section>

            {/* DotD */}
            <section id="dotd" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  06
                </span>
                Driver of the Day
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-dim">
                Optionally pick the official F1 &quot;Driver of the Day&quot;
                before the race for <strong className="text-ink">+5 pts</strong>.
                The model can&apos;t vote — this one is a pure human edge.
              </p>
            </section>

            {/* Champions */}
            <section id="champions" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  07
                </span>
                Championship picks
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
                <p>
                  Once per season, call the{" "}
                  <strong className="text-ink">Drivers&apos; champion</strong> and
                  the <strong className="text-ink">Constructors&apos; champion</strong>.
                  Picks lock the moment you confirm — no take-backs — and settle at
                  season end.
                </p>
                <p>
                  The bigger the outsider and the earlier you call it, the bigger
                  the payout (a P4-or-lower driver is worth up to +150). Your
                  profile wears your pick&apos;s team colours all year.
                </p>
              </div>
            </section>

            {/* Standings */}
            <section id="standings" className="scroll-mt-28">
              <h2 className="display flex items-baseline gap-3 text-2xl font-extrabold tracking-tight">
                {/* The same numeral the index carries, so the rail is an
                    index and not a second navigation. */}
                <span
                  aria-hidden
                  className="font-mono text-base font-semibold text-ink-mute tabular-nums"
                >
                  08
                </span>
                Standings &amp; leagues
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
                <p>
                  The season table ranks on the{" "}
                  <strong className="text-ink">duel</strong>, not on a points
                  pile: Grands Prix won, then your{" "}
                  <strong className="text-ink">margin</strong> — how far ahead of
                  the model you finished across the races you played — then raw
                  points. A race you sat out counts neither way.
                </p>
                <p>
                  So it doesn&apos;t matter when you arrive. Everyone starts the
                  season at nought wins, including someone joining at round 20,
                  and the model isn&apos;t in the table at all — it can&apos;t
                  duel itself. It&apos;s the bar above it.
                </p>
                <p>
                  Create or join a{" "}
                  <strong className="text-ink">private league</strong> with a
                  6-character code to settle it with friends — a league is just a
                  filtered leaderboard; all scoring stays global.
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-dim">Ready? Your first duel is waiting.</p>
          <Link
            href="/game"
            className="pressable btn-race px-8 py-3.5 text-base font-semibold"
          >
            Play F1 Duel
          </Link>
        </div>
    </main>
  );
}
