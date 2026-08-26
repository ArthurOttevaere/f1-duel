import Link from "next/link";
import NextRaceWidget from "@/components/NextRaceWidget";
import LastRaceProof, { loadLastRace } from "@/components/LastRaceProof";
import { formatPoints } from "@/lib/format";

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

export default async function Home() {
  // Read here as well as in the section itself (both hit one cached load) so
  // the hero only points down at proof that exists.
  const lastRace = await loadLastRace();

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pt-28 pb-24 text-center sm:pt-24">
        <div className="aurora" />
        <div className="hero-grid" />
        {/* Fade the bottom to the page background so the glow never gets cut
            at the transition into the next section. Eight rem, and no more: it
            was tried at fourteen to soften the step into the next section, and
            fourteen reaches far enough up to dim the aurora and the grid — the
            two things that dress the hero in the first place. The step is worth
            keeping to keep them lit. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg" />

        <NextRaceWidget />

        {/* Wider gap than the rest of the hero's rhythm on purpose: the
            headline is 72px on desktop, and 24px under it left the widget
            looking stuck to it rather than introducing it. */}
        <h1 className="display rise-in rise-in-2 mt-10 max-w-4xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:mt-14 sm:text-7xl sm:leading-[1.02]">
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
            className="pressable btn-race px-8 py-3.5 text-base font-semibold"
          >
            Play F1 Duel
          </Link>
          <Link
            href="/model"
            className="pressable glass-chip rounded-control px-8 py-3.5 text-base font-semibold text-ink transition-colors hover:border-line-hi"
          >
            Explore the model
          </Link>
        </div>

        {/* The hero used to end here, with two fifths of the viewport empty
            under the buttons and nothing saying the page continued. The cue
            fills that gap with the one line that earns the scroll — a real
            score, from a real Grand Prix, waiting a screen below. It is only
            rendered when there is something to scroll to. */}
        {lastRace && (
          <Link
            href="#last-race"
            className="rise-in rise-in-5 group absolute inset-x-0 bottom-10 mx-auto flex w-fit flex-col items-center gap-2 px-4 text-center"
          >
            <span className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase transition-colors group-hover:text-ink-dim">
              Last time out it scored {formatPoints(lastRace.total)} ·{" "}
              {lastRace.exact} of 10 exact
            </span>
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              className="size-4 text-ink-mute transition-transform group-hover:translate-y-0.5"
            >
              <path
                d="M8 3v9m0 0 4-4m-4 4-4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        )}
      </section>

      {/* ─── The proof ────────────────────────────────────────────────── */}
      <LastRaceProof />

      {/* ─── The game ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-[min(64rem,calc(100%-2rem))] py-24">
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          The game
        </p>
        <h2 className="display mt-3 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          A season-long duel against the machine
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {DUEL_STEPS.map((s) => (
            <article key={s.step} className="glass-card p-6">
              <p className="font-mono text-sm text-race">{s.step}</p>
              <h3 className="display mt-3 text-lg font-extrabold tracking-tight">{s.title}</h3>
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
            <h2 className="display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Not just any opponent
            </h2>
            {/* This used to promise "a full prediction platform" with live
                weather, circuit maps and championship scenarios. All of that
                exists — in the Flask app, which isn't deployed, so the button
                led to a page that described things nobody could reach. It now
                promises the thing you can actually open: the model's own
                probability matrix for the last Grand Prix it played. */}
            <p className="mt-4 leading-relaxed text-ink-dim">
              Before every Grand Prix it simulates the race ten thousand times
              and works out, for each driver, how often they finish in each
              position. You can read that grid yourself — it&apos;s the same one
              your rarity multipliers come out of.
            </p>
            {/* Not "what it expects this weekend": since migration 0009 the
                grid for a race that is still open is nobody's to read — the
                model is held to the same lock as the players. What /model
                publishes is the last race it actually played. */}
            <Link
              href="/model"
              className="pressable mt-8 inline-block rounded-control border border-line-hi px-6 py-3 text-sm font-semibold transition-colors hover:bg-glass-strong"
            >
              See how it read the last race →
            </Link>
          </div>

          {/* A surface, and a heading over it. Four bullets floating in the
              right half — under a left column that has an eyebrow, a heading,
              a paragraph and a button — read as text that had lost its card,
              and the two halves of the section didn't look like one thing.
              The rule from globals.css still holds: sections aren't separated
              with bands. This is a card inside a section, which the page
              already does in "The game". */}
          <div className="glass-card p-2">
            <p className="px-4 pt-3 pb-2 font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
              Under the hood
            </p>
            <ul className="flex flex-col">
              {MODEL_FACTS.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-3 border-t border-line px-4 py-3.5 text-sm text-ink-dim"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-race"
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
