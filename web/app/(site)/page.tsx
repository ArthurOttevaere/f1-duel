import Link from "next/link";
import Arrow from "@/components/Arrow";
import NextRaceLine from "@/components/NextRaceLine";
import PickBoardShot from "@/components/PickBoardShot";
import ScoringScale from "@/components/ScoringScale";
import HeroRaceCard from "@/components/HeroRaceCard";
import HeroTraceBleed from "@/components/HeroTraceBleed";
import LastRaceProof, { loadLastRace } from "@/components/LastRaceProof";
import { formatPoints } from "@/lib/format";
import { circuitTrace } from "@/lib/circuits";
import { nextRace } from "@/lib/nextRace";

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

/**
 * The four facts about the model, as what they always were: key/value pairs.
 * They were bullets — a 6px red disc in front of each — which is a tic, and a
 * tic that mislabels its own content. "Features: 39" is a spec, not an
 * argument, and the site already has a shape for specs: the label/value/rule
 * row of /rules.
 */
const MODEL_SPEC = [
  { key: "Ensemble", value: "XGBoost + LightGBM, blended by validation performance" },
  { key: "Features", value: "39 — pace, form, reliability, circuit history, weather" },
  { key: "Probabilities", value: "Win and podium, from Monte-Carlo simulation" },
  { key: "Explained", value: "Every prediction, factor by factor (SHAP)" },
];

export default async function Home() {
  // Both reads are request-cached and shared with the components below, so
  // the hero only points down at proof that exists and only draws a circuit
  // the calendar actually has.
  const lastRace = await loadLastRace();
  const race = await nextRace();
  const trace = circuitTrace(race?.circuit);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      {/* Two columns from `lg` up, and the text is left-aligned at every
          width. Centred-everything was the shape this page had, and it is the
          shape every generated landing page has; a headline that starts on a
          margin reads as typeset rather than as centred-by-default. Below
          `lg` the trace drops under the buttons as a band. */}
      <section className="relative flex min-h-svh flex-col justify-center overflow-hidden px-4 pt-28 pb-24 sm:pt-24">
        {/* With no trace there is no light in the hero at all, and a section
            lit by nothing reads as unfinished rather than as restrained. The
            reduced glow stands in — still one source. */}
        {!trace && <div className="page-glow" />}
        {/* Below `lg` the circuit is a corner bleed rather than a card under
            the buttons — see HeroTraceBleed. */}
        {trace && <HeroTraceBleed trace={trace} />}
        <div className="hero-grid" />
        {/* Fade the bottom to the page background so the trace's glow is never
            cut at the transition into the next section. Eight rem, and no
            more: it was tried at fourteen and fourteen reaches far enough up
            to dim the grid, which is half of what dresses the hero. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg" />

        {/* Two columns only when there is a second column to fill. Between
            seasons the grid collapses to one and the text takes the width it
            wants, instead of hugging the left of an empty half. */}
        <div
          className={`mx-auto grid items-center gap-12 ${
            trace
              ? "w-[min(72rem,100%)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-16"
              : "w-[min(48rem,100%)]"
          }`}
        >
          <div className="flex max-w-2xl flex-col items-start lg:max-w-none">
            {/* The eyebrow is one line of 12px type now, not a chip, so the
                headline follows it the way it follows every other eyebrow on
                the site — closely. It used to need forty pixels of air to stop
                looking stuck to a box.

                The gap belongs to the line, not to the headline: from `lg` up
                the line is hidden (the race card owns the clock there) and a
                `mt-*` on the h1 would leave its margin behind as dead space at
                the top of the hero. */}
            <NextRaceLine
              race={race}
              hasTrace={Boolean(trace)}
              className="rise-in mb-4 sm:mb-5"
            />

            {/* 60px and no further. The headline used to be 72px across a
                centred full-width hero; in a 600px column "Beat the model."
                breaks onto two lines at 72 and the hero becomes four lines of
                display type. The composition carries the scale now. */}
            <h1 className="display rise-in rise-in-2 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl sm:leading-[1.02]">
              Beat the model.
              <br />
              {/* F-2: the second line is cut out of the page rather than
                  filled. A gradient across a headline is the single most
                  recognisable tell in the whole audit — it dates from 2021 and
                  it is the first reflex of any model asked for a hero. A
                  stencil is what a pit board actually is. */}
              <span className="hero-outline">Every single Sunday.</span>
            </h1>

            <p className="rise-in rise-in-3 mt-6 max-w-xl text-base text-ink-dim sm:text-lg">
              Predict the top 10 of every Grand Prix and go head-to-head with a
              machine-learning model — all season long. Bold calls score big.
              Safe ones don&apos;t.
            </p>

            <div className="rise-in rise-in-4 mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/game"
                className="pressable btn-race px-8 py-3.5 text-center text-base font-semibold"
              >
                Play F1 Duel
              </Link>
              <Link
                href="/model"
                className="pressable glass-chip rounded-control px-8 py-3.5 text-center text-base font-semibold text-ink transition-colors hover:border-line-hi"
              >
                Explore the model
              </Link>
            </div>
          </div>

          {/* Last on a phone, beside the headline from `lg` up.
              The mock put it directly under the title on mobile; that pushes
              both buttons below the fold to make room for an ornament, and the
              circuit is a signature, not a call to action. It stays where a
              signature goes.

              No trace between seasons, or at a venue that has never been
              raced — the hero simply carries no ornament, which is better
              than carrying somebody else's circuit. */}
          {trace && race && (
            <HeroRaceCard
              trace={trace}
              race={race}
              className="rise-in rise-in-3 hidden lg:block"
            />
          )}
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

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
          {/* Three equal numbered cards is the block any model produces when
              asked "how does it work", and this site had it twice. The cards
              are gone: the numeral hangs in the margin, a hairline separates
              the steps, and the whole thing is the house rule — space and
              type, never a band (§1.4) — applied to the one block that had
              forgotten it. */}
          <ol className="border-b border-line">
            {DUEL_STEPS.map((s) => (
              <li
                key={s.step}
                className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-t border-line py-7 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-8 sm:py-9"
              >
                {/* The <ol> already numbers this list for a screen reader; the
                    numeral is the same count, drawn. */}
                <span
                  aria-hidden
                  className="font-mono text-2xl leading-none font-semibold text-race tabular-nums sm:text-4xl"
                >
                  {s.step}
                </span>
                <div>
                  <h3 className="display text-lg font-extrabold tracking-tight sm:text-xl">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* The screen the three steps describe, running past the column.
              See PickBoardShot — it is the board itself, not a picture. */}
          <PickBoardShot />
        </div>

        <ScoringScale className="mt-16" />

        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink-mute">
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
              className="pressable group mt-8 inline-flex items-center gap-2.5 rounded-control border border-line-hi px-6 py-3 text-sm font-semibold transition-colors hover:bg-glass-strong"
            >
              See how it read the last race
              <Arrow />
            </Link>
          </div>

          {/* A surface, and a heading over it. Four lines floating in the
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
            <dl className="flex flex-col">
              {MODEL_SPEC.map((f) => (
                <div
                  key={f.key}
                  className="grid gap-x-4 gap-y-1 border-t border-line px-4 py-3.5 sm:grid-cols-[6.5rem_minmax(0,1fr)]"
                >
                  <dt className="font-mono text-[0.65rem] tracking-[0.16em] text-ink-mute uppercase sm:pt-0.5">
                    {f.key}
                  </dt>
                  <dd className="text-sm leading-relaxed text-ink-dim">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
