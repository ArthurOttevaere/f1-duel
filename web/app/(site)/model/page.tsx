import Link from "next/link";
import { LIVE_MODEL_URL } from "@/lib/constants";
import { formatRaceDate } from "@/lib/format";
import { latestMatrix, GRID_POSITIONS } from "@/lib/latestMatrix";
import ProbabilityGrid from "@/components/ProbabilityGrid";
import ModelPipeline from "@/components/ModelPipeline";
import CalibrationRecord from "@/components/CalibrationRecord";

export const metadata = {
  title: "The model",
  description:
    "How the F1 Duel opponent works: an XGBoost + LightGBM ensemble on eight seasons of Formula 1, calibrated into a fair, beatable duel entry.",
};

export const revalidate = 300;

const FEATURE_GROUPS = [
  { label: "Pace & form", items: "recent finishing pace, qualifying gap, rolling results, teammate delta" },
  { label: "Car & team", items: "constructor strength, upgrades window, season trajectory" },
  { label: "Reliability", items: "DNF history, mechanical-failure rate, finish ratio" },
  { label: "Circuit", items: "track type, past results here, overtaking difficulty" },
  { label: "Conditions", items: "live weather, rain probability, temperature" },
  { label: "Grid", items: "starting position, front-row / points-row odds" },
];

export default async function ModelPage() {
  const matrix = await latestMatrix();

  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      {/* ── Intro ── */}
        <section className="relative overflow-hidden">
          <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
            The opponent
          </p>
          <h1 className="display mt-3 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            The machine you&apos;re racing
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-dim">
            Every Grand Prix you go head-to-head with a machine-learning model
            trained on eight seasons of Formula 1. It isn&apos;t a gimmick — it&apos;s
            a real forecasting pipeline, deliberately calibrated so the duel is
            winnable by good play, not luck.
          </p>

          {LIVE_MODEL_URL && (
            <a
              href={LIVE_MODEL_URL}
              target="_blank"
              rel="noreferrer"
              className="pressable mt-8 inline-block btn-race px-6 py-3 text-sm font-semibold"
            >
              Open the live prediction platform ↗
            </a>
          )}
        </section>

        {/* ── The matrix ──────────────────────────────────────────────────
            The page used to describe a 10,000-run simulation and show none of
            it. This is that simulation's actual output, for the last race the
            model played. */}
        {matrix && (
          <section className="mt-16">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="display text-2xl font-extrabold tracking-tight">
                  What it thought of {matrix.race.name}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-dim">
                  Ten thousand simulated races, reduced to one number per driver
                  per position: how often they finished there. This is the
                  matrix the whole game runs on — the model plays the top 10
                  that maximises its own expected score from it, and your rarity
                  multiplier is read straight out of it.
                </p>
              </div>
              <p className="font-mono text-xs whitespace-nowrap text-ink-mute">
                Round {matrix.race.round} ·{" "}
                {matrix.entry.pre_quali ? "pre-quali" : "post-quali"} ·{" "}
                {formatRaceDate(matrix.race.race_at)}
              </p>
            </div>

            <div className="mt-6">
              <ProbabilityGrid
                drivers={matrix.drivers}
                positions={GRID_POSITIONS}
                modelOrder={matrix.entry.predicted_order}
              />
            </div>
          </section>
        )}

        {/* ── Pipeline (M-1) ── */}
        <section className="mt-16">
          <h2 className="display text-2xl font-extrabold tracking-tight">How it predicts</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-dim">
            Eight seasons in, one top 10 out. Everything in between is
            narrowing.
          </p>
          {/* Four glass cards in a 2×2 grid became the drawing itself — see
              ModelPipeline. The counts are the picture. */}
          <ModelPipeline className="mt-10" />
        </section>

        {/* ── Features (M-2) ── */}
        <section className="mt-16">
          <h2 className="display text-2xl font-extrabold tracking-tight">
            39 features, six angles
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-dim">
            The model doesn&apos;t just look at the grid. Each driver&apos;s
            weekend is described from six directions:
          </p>
          {/* Six equal cards was the third grid of equal cards on the site,
              and the content is tabular: a category and the things in it.
              A card carries hierarchy; there is none here to carry. It reads
              as the spec sheet of a model now, which is what the page is. */}
          <dl className="mt-8 border-b border-line">
            {FEATURE_GROUPS.map((g) => (
              <div
                key={g.label}
                className="grid gap-x-8 gap-y-1.5 border-t border-line py-4 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:py-5"
              >
                <dt className="font-mono text-[0.65rem] tracking-[0.18em] text-ink uppercase">
                  {g.label}
                </dt>
                <dd className="text-sm leading-relaxed text-ink-dim">
                  {g.items}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Calibration / fairness (M-3, M-4) ── */}
        <section className="mt-16">
          {/* M-3: the section used to be a glass-card wrapped around a
              two-column grid — a surface stacked on a surface, carrying no
              hierarchy of its own. Space and type, like everywhere else. */}
          <h2 className="display text-2xl font-extrabold tracking-tight">
            Why it&apos;s a <span className="text-race">fair</span> fight
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 sm:gap-12">
            <div>
              <h3 className="text-sm font-semibold">
                It doesn&apos;t just copy the grid
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                In Formula 1, grid position is a very strong predictor of the
                finish. A raw model that always plays its most-likely order is
                easy to tie by copying the grid. So the model&apos;s entry is
                <strong className="text-ink"> calibrated</strong>: its
                simulated probabilities are blended with a historical
                <em> P(finish | grid)</em> prior, and it plays the order that
                maximises its own expected points.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Boldness is your edge</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                Because the model plays its most likely order, it almost never
                earns the rarity multiplier. You beat it by finding the
                correct <strong className="text-ink">deviation</strong>{" "}
                from the favourites — the upset it didn&apos;t dare to call. That
                asymmetry, not raw accuracy, is the whole game.
              </p>
            </div>
          </div>

          {/* M-4: the one sentence that proved all of the above used to be
              12px of mute text under the card. It is the chart now. */}
          <CalibrationRecord className="mt-12" />
        </section>

        {/* ── CTA ── */}
        <section className="mt-16 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="display text-2xl font-extrabold tracking-tight">
              Think you can read a race better?
            </h2>
            <p className="mt-2 text-sm text-ink-dim">
              There&apos;s one duel every Grand Prix. Prove it.
            </p>
          </div>
          <Link
            href="/game"
            className="pressable btn-race px-8 py-3.5 text-base font-semibold"
          >
            Play F1 Duel
          </Link>
        </section>
    </main>
  );
}
