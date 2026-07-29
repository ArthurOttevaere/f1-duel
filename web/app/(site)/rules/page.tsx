import Link from "next/link";

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
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          How F1 Duel works
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-dim">
          Predict the top 10 of every Grand Prix, bet on chaos, and go
          head-to-head with the model all season. Everything you need to know is
          below.
        </p>

        {/* quick nav */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="glass-chip rounded-full px-3 py-1.5 text-xs text-ink-dim transition-colors hover:text-ink"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 flex flex-col gap-12">
          {/* Duel */}
          <section id="duel" className="scroll-mt-28">
            <h2 className="text-2xl font-bold tracking-tight">
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
            <h2 className="text-2xl font-bold tracking-tight">
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
            <h2 className="text-2xl font-bold tracking-tight">
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
            <div className="glass-card mt-5 p-6">
              <Row left="Model gave it ≥ 30% — a favourite" right="×1" />
              <Row left="Model gave it 15–30%" right="×1.5" />
              <Row left="Model gave it 5–15%" right="×2" />
              <Row left="Model gave it under 5% — a long shot" right="×3" />
            </div>
          </section>

          {/* Bonuses */}
          <section id="bonuses" className="scroll-mt-28">
            <h2 className="text-2xl font-bold tracking-tight">Bonuses</h2>
            <div className="glass-card mt-5 p-6">
              <Row left="Exact podium — P1, P2, P3 all spot on" right="+15" />
              <Row left="Perfect top 10 — all ten exact" right="+100" />
              <Row left="Correct Driver of the Day" right="+5" />
              <Row left="Correct safety-car bet" right="+8" />
              <Row left="Beating the model this Grand Prix" right="+10" />
              <Row left="Drawing with the model" right="+3" />
            </div>
            <p className="mt-4 text-xs text-ink-mute">
              A typical solid weekend lands around 40–70 pts; a bold, accurate
              one can clear 130+.
            </p>
          </section>

          {/* Safety car */}
          <section id="safety-car" className="scroll-mt-28">
            <h2 className="text-2xl font-bold tracking-tight">
              Safety-car bet
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
              <p>
                Alongside your top 10 you can bet{" "}
                <strong className="text-ink">Yes/No</strong> on whether a safety
                car — full <em>or</em> virtual (VSC) — will be deployed during
                the race. Call it right and it&apos;s{" "}
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
            <h2 className="text-2xl font-bold tracking-tight">
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
            <h2 className="text-2xl font-bold tracking-tight">
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
            <h2 className="text-2xl font-bold tracking-tight">
              Standings &amp; leagues
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
              <p>
                The season leaderboard totals your points across every scored GP
                plus bonuses. Your{" "}
                <strong className="text-ink">duel record</strong> (W–D–L vs the
                model) rides on your profile.
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

        <div className="mt-16 flex flex-col items-start gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-dim">Ready? Your first duel is waiting.</p>
          <Link
            href="/game"
            className="pressable rounded-full bg-race px-8 py-3.5 text-base font-semibold text-white shadow-[0_10px_32px_rgb(255_30_60/0.4)] transition-colors hover:bg-race-deep"
          >
            Play F1 Duel
          </Link>
        </div>
    </main>
  );
}
