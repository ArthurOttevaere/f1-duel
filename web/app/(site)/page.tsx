import Link from "next/link";
import NextRaceWidget from "@/components/NextRaceWidget";

const DUEL_STEPS = [
  {
    step: "01",
    title: "Call your top 10",
    body: "Every race weekend, predict the finishing order of the Grand Prix — free to edit until the lights go out on Sunday.",
  },
  {
    step: "02",
    title: "The model answers",
    body: "A machine-learning ensemble trained on eight seasons of Formula 1 locks its own top 10 after qualifying. Same race, same rules, no excuses.",
  },
  {
    step: "03",
    title: "Boldness pays",
    body: "Every correct call scores — and the less the model believed in your pick, the bigger the multiplier. Parroting the favourites won't cut it.",
  },
];

const SCORING_HIGHLIGHTS = [
  { value: "10 pts", label: "exact position" },
  { value: "×3", label: "on the boldest calls" },
  { value: "+15", label: "perfect podium" },
  { value: "+100", label: "perfect top 10" },
];

const MODEL_FACTS = [
  "XGBoost + LightGBM ensemble, blended by validation performance",
  "39 engineered features: pace, form, reliability, circuit history, weather",
  "Win & podium probabilities from Monte-Carlo simulation",
  "Every prediction explained factor by factor (SHAP)",
];

export default function Home() {
  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pt-28 pb-24 text-center sm:pt-24">
        <div className="aurora" />
        <div className="hero-grid" />
        {/* Fade the bottom to the page background so the glow never gets cut
            at the transition into the next section. Fourteen rem rather than
            eight: over eight, the red still had somewhere to go when the ramp
            ran out, and the hero ended on a visible step. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-bg" />

        <NextRaceWidget />

        {/* Wider gap than the rest of the hero's rhythm on purpose: the
            headline is 72px on desktop, and 24px under it left the widget
            looking stuck to it rather than introducing it. */}
        <h1 className="rise-in rise-in-2 mt-10 max-w-4xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:mt-14 sm:text-7xl sm:leading-[1.02]">
          Beat the model.
          <br />
          <span className="bg-gradient-to-r from-race to-[#ff7a5c] bg-clip-text text-transparent">
            Every single Sunday.
          </span>
        </h1>

        <p className="rise-in rise-in-3 mt-6 max-w-xl text-base text-ink-dim sm:text-lg">
          Predict the top 10 of every Grand Prix and go head-to-head with a
          machine-learning model — all season long. Bold calls score big.
          Safe ones don&apos;t.
        </p>

        <div className="rise-in rise-in-4 mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/game"
            className="pressable rounded-full bg-race px-8 py-3.5 text-base font-semibold text-white shadow-[0_10px_32px_rgb(255_30_60/0.4)] transition-colors hover:bg-race-deep"
          >
            Play F1 Duel
          </Link>
          <Link
            href="/model"
            className="pressable glass-chip rounded-full px-8 py-3.5 text-base font-semibold text-ink transition-colors hover:border-line-hi"
          >
            Explore the model
          </Link>
        </div>
      </section>

      {/* ─── The game ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-[min(64rem,calc(100%-2rem))] py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          The game
        </p>
        <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
          A season-long duel against the machine
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {DUEL_STEPS.map((s) => (
            <article key={s.step} className="glass-card p-6">
              <p className="font-mono text-sm text-race">{s.step}</p>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                {s.body}
              </p>
            </article>
          ))}
        </div>

        <div className="glass-card mt-4 grid grid-cols-2 gap-y-8 p-8 sm:grid-cols-4">
          {SCORING_HIGHLIGHTS.map((h) => (
            <div key={h.label} className="text-center">
              <p className="font-mono text-3xl font-semibold text-ink">
                {h.value}
              </p>
              <p className="mt-1 text-sm text-ink-mute">{h.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-ink-mute">
          Plus: vote the Driver of the Day, pick your world champions before
          it&apos;s obvious, and settle it all in a private league with your
          friends.
        </p>
      </section>

      {/* ─── The model ────────────────────────────────────────────────── */}
      {/* No background treatment here, on purpose — see the note in
          globals.css where `.zone-glow` used to be. */}
      <section>
        <div className="mx-auto grid w-[min(64rem,calc(100%-2rem))] gap-12 py-24 sm:grid-cols-2 sm:items-center">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
              The opponent
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Not just any opponent
            </h2>
            <p className="mt-4 leading-relaxed text-ink-dim">
              Behind the duel sits a full prediction platform: race and
              qualifying forecasts for every Grand Prix, live weather,
              circuit maps, championship scenarios — and the reasoning behind
              every predicted position.
            </p>
            <Link
              href="/model"
              className="pressable mt-8 inline-block rounded-full border border-line-hi px-6 py-3 text-sm font-semibold transition-colors hover:bg-glass-strong"
            >
              Explore the prediction platform →
            </Link>
          </div>

          <ul className="flex flex-col gap-4">
            {MODEL_FACTS.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink-dim">
                <span
                  aria-hidden
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-race"
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
