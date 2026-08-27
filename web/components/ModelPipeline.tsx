/**
 * How the model predicts, drawn instead of listed.
 *
 * It used to be four `glass-card`s in a 2×2 grid — the same block the home
 * page carried three times, and worse here: the four steps *are* a sequence,
 * and a 2×2 grid breaks the one thing a sequence has, which is a reading
 * order. §5.5 turns that block into hanging numerals; this one goes further,
 * because a pipeline has a shape and the page was showing none of it.
 *
 * The drawing is the quantities themselves. Eight strokes for eight seasons,
 * two for two models, a hatch at the same pitch running off the edge for ten
 * thousand simulations, and one red stroke for the single hand the model
 * actually plays. Read left to right, that funnel is the argument the prose
 * is making — a great deal of history, narrowed to one entry — so the picture
 * and the rule are the same thing (§1.1).
 *
 * Two decisions worth keeping:
 *
 * - **No 01–04 numerals.** §5.5 wants a sequence numbered, but here the
 *   numbers *are* the content: 8, 2, 10,000, 1. Setting a second series of
 *   numerals beside them would be four counts arguing with four indices. The
 *   `<ol>` still carries the order for a screen reader, and the connecting
 *   rule carries it for everyone else.
 * - **The rule is the cells' own top border**, not an absolutely-positioned
 *   line, so there is nothing to keep in sync. Gutters live on the content
 *   inside each cell rather than on the grid, which is what keeps the four
 *   borders touching and reading as one continuous trait across the page.
 */

/** 2px stroke, 5px gap. The hatch below repeats on the same 7px pitch. */
const HATCH =
  "repeating-linear-gradient(to right, currentColor 0 2px, transparent 2px 7px)";

/** Ten thousand of anything cannot be drawn; it can only be run off the page. */
const HATCH_FADE = "linear-gradient(to right, #000 0 45%, transparent 94%)";

const STAGES = [
  {
    strokes: 8,
    value: "8",
    unit: "seasons",
    title: "Learn the sport",
    body: "Every Grand Prix since 2018 — results, grids, pace, weather, reliability — becomes 39 engineered features per driver, per weekend.",
  },
  {
    strokes: 2,
    value: "2",
    unit: "models",
    title: "Two models, one voice",
    body: "An XGBoost and a LightGBM each score every driver. The blend follows how well each one did on held-out validation races.",
  },
  {
    strokes: "hatch" as const,
    value: "10,000",
    unit: "simulated races",
    title: "Run the race, over and over",
    body: "Those scores plus race-day randomness are Monte-Carlo simulated into one number per driver, per position: how often they finished there.",
  },
  {
    strokes: 1,
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
          // The air above each glyph is the list's on a phone and the
          // track's from `lg` up, where the four heads already sit on one
          // line — as a padding it would eat the h-9 the strokes stand in.
          <li key={s.value} className="flex flex-col mt-8 first:mt-0 lg:mt-0">
            {/* The strokes stand on the rule below them, like marks on a
                timing board. Square ends, per §5.4. */}
            <div
              aria-hidden
              className={`flex h-9 items-end gap-[5px] pr-6 lg:pr-8 ${
                last ? "text-race" : "text-ink-mute"
              }`}
            >
              {s.strokes === "hatch" ? (
                <span
                  className="block h-full w-full"
                  style={{
                    backgroundImage: HATCH,
                    maskImage: HATCH_FADE,
                    WebkitMaskImage: HATCH_FADE,
                  }}
                />
              ) : (
                Array.from({ length: s.strokes }).map((_, n) => (
                  <span key={n} className="block h-full w-0.5 bg-current" />
                ))
              )}
            </div>

            {/* The trait. Four touching top borders, one line. */}
            <div className="mt-3 border-t border-line pt-4 lg:pt-5">
              <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
                <span className={last ? "text-race" : "text-ink"}>{s.value}</span>{" "}
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
