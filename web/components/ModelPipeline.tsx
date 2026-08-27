/**
 * How the model predicts, drawn instead of listed.
 *
 * It used to be four `glass-card`s in a 2×2 grid — the same block the home
 * page carried three times, and worse here: the four steps *are* a sequence,
 * and a 2×2 grid breaks the one thing a sequence has, which is a reading
 * order. §5.5 turns that block into hanging numerals; this one goes further,
 * because a pipeline has a shape and the page was showing none of it.
 *
 * **The drawing is the numbers themselves, set the size of a car number.**
 * Eight seasons, two models, ten thousand simulated races, one top 10 played:
 * read left to right along the rule they stand on, that funnel is the argument
 * the prose is making — a great deal of history, narrowed to a single entry —
 * so the picture and the rule are the same thing (§1.1).
 *
 * **What was tried first and thrown away:** the same four counts drawn as
 * tallies — eight strokes, two, a hatch, one — standing on the rule like marks
 * on a timing board. It was legible as a funnel and completely mute as to
 * *why* there were strokes there at all: a reader's first question was what
 * the marks meant, which is the one question an illustration may not raise. A
 * number needs no key.
 *
 * Two more decisions worth keeping:
 *
 * - **No 01–04 numerals.** §5.5 wants a sequence numbered, but here the
 *   numbers *are* the content. A second series beside them would be four
 *   indices arguing with four counts. The `<ol>` still carries the order for a
 *   screen reader, and the rule carries it for everyone else.
 * - **The rule is the cells' own top border**, not an absolutely-positioned
 *   line, so there is nothing to keep in sync. Gutters live on the content
 *   inside each cell rather than on the grid, which is what keeps the four
 *   borders touching and reading as one continuous trait across the page.
 */
const STAGES = [
  {
    value: "8",
    unit: "seasons",
    title: "Learn the sport",
    body: "Every Grand Prix since 2018 — results, grids, pace, weather, reliability — becomes 39 engineered features per driver, per weekend.",
  },
  {
    value: "2",
    unit: "models",
    title: "Two models, one voice",
    body: "An XGBoost and a LightGBM each score every driver. The blend follows how well each one did on held-out validation races.",
  },
  {
    value: "10,000",
    unit: "simulated races",
    title: "Run the race, over and over",
    body: "Those scores plus race-day randomness are Monte-Carlo simulated into one number per driver, per position: how often they finished there.",
  },
  {
    value: "1",
    unit: "top 10 played",
    title: "Play a calibrated hand",
    body: "The probabilities are blended with a historical grid prior, and the model enters the top 10 that maximises its own expected score.",
  },
];

export default function ModelPipeline({ className = "" }: { className?: string }) {
  return (
    <ol
      className={`grid border-b border-line lg:grid-cols-4 lg:border-b-0 ${className}`}
    >
      {STAGES.map((s, i) => {
        const last = i === STAGES.length - 1;
        return (
          // The air above each numeral is the list's on a phone and the
          // track's from `lg` up, where the four heads already sit on one
          // line — as a padding it would eat the box the digits stand in.
          <li key={s.value} className="mt-8 flex flex-col first:mt-0 lg:mt-0">
            {/* Mono, because every number on this site is (§4.2), and one
                size for all four: what varies across the track is the width
                of the number, which is the whole point of a funnel. 48px is
                the ceiling — "10,000" is six glyphs and a quarter of 64rem is
                224 of them. */}
            <p
              aria-hidden
              className={`flex h-14 items-end pr-6 font-mono text-5xl leading-none font-semibold tracking-tight tabular-nums lg:pr-8 ${
                last ? "text-race" : "text-ink"
              }`}
            >
              {s.value}
            </p>

            {/* The trait. Four touching top borders, one line. */}
            <div className="mt-3 border-t border-line pt-4 lg:pt-5">
              <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
                {s.unit}
              </p>
              {/* Two of the four titles take two lines at this column width.
                  Reserving both from `lg` up is what keeps the four bodies
                  starting on one baseline — a drawn track whose text blocks
                  begin at four different heights reads as four columns that
                  happen to be next to each other. */}
              <h3 className="display mt-2 pr-6 text-base font-extrabold tracking-tight lg:min-h-[3.5rem] lg:pr-8 lg:text-lg">
                {s.title}
              </h3>
              <p className="mt-2 pr-6 text-sm leading-relaxed text-ink-dim lg:pr-8">
                {s.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
