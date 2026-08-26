import { latestMatrix } from "@/lib/latestMatrix";

/**
 * The home page's second product shot: the model's own probability matrix,
 * cropped.
 *
 * The section used to sit beside a card listing `XGBoost + LightGBM` and
 * `39 features`, which is a résumé — and the paragraph next to it described a
 * grid nobody could see. This is that grid: the real matrix from the last race
 * the model actually played, in the same rows and the same bands `/model`
 * draws, running past its column and dissolving.
 *
 * It follows `PickBoardShot`'s two rules exactly (§9). It is **real markup
 * from real rows**, not a picture, so there is nothing to re-capture when the
 * design moves. And the whole replica is `aria-hidden` behind one `sr-only`
 * sentence, because a screen reader given two hundred bare percentages gets
 * noise, not the argument — the link beside it leads to the readable cut.
 *
 * Between seasons, or before the model has played a race, there is no matrix
 * and the component renders nothing. The section's text stands on its own.
 */

/**
 * The bands are `ProbabilityGrid`'s, and they are the game's multiplier tiers
 * (GAME_DESIGN §2.2) rather than a generic ramp: colour is the model's
 * confidence, so the pale end is exactly where the points are. Duplicated as a
 * const rather than imported, because the grid's live in a `"use client"`
 * module and this is a server component that only needs the fills.
 */
const BANDS: [number, string][] = [
  [0.3, "rgb(255 30 60 / 0.88)"],
  [0.15, "rgb(255 30 60 / 0.55)"],
  [0.05, "rgb(255 30 60 / 0.3)"],
  [0.02, "rgb(255 30 60 / 0.14)"],
  [0, "rgb(255 255 255 / 0.03)"],
];

const fillFor = (p: number) =>
  (BANDS.find(([min]) => p >= min) ?? BANDS[BANDS.length - 1])[1];

/**
 * Eight rows and six columns. The crop is cut to the height of the text
 * beside it: at ten rows the block outgrew its column and the fade started
 * eating the paragraph's last line instead of the matrix's last row.
 */
const ROWS = 8;
const COLS = 6;

export default async function ProbabilityShot({
  className = "",
}: {
  className?: string;
}) {
  // Request-cached, and /model pays for the same read.
  const matrix = await latestMatrix();
  if (!matrix) return null;

  return (
    <ProbabilityCrop
      className={className}
      raceName={matrix.race.name}
      drivers={matrix.drivers}
    />
  );
}

/** The replica itself, split out so it can be rendered from fixtures. */
export function ProbabilityCrop({
  drivers: all,
  raceName,
  className = "",
}: {
  drivers: { driverId: string; code: string; color?: string; probs: number[] }[];
  raceName: string;
  className?: string;
}) {
  const drivers = all.slice(0, ROWS);
  if (drivers.length === 0) return null;

  return (
    <div className={className}>
      <span className="sr-only">
        A crop of the model&apos;s probability matrix for {raceName}: for each
        driver, how often the simulation put them in each position. The readable
        version is on the model page.
      </span>

      {/* Runs past its column from `lg` up and dissolves, the way the pick
          board does: the crop is a window onto something bigger, and a matrix
          that stops tidily at the container edge looks like a table instead. */}
      <div aria-hidden className="shot-fade-y lg:shot-fade-x lg:-mr-10 xl:-mr-16">
        <div
          className="grid gap-px font-mono text-[0.65rem] tabular-nums"
          style={{
            gridTemplateColumns: `2.75rem repeat(${COLS}, minmax(2rem, 1fr))`,
          }}
        >
          {/* The header runs P1…P6 with an empty cell over the driver codes. */}
          <span />
          {Array.from({ length: COLS }, (_, i) => (
            <span
              key={`h${i}`}
              className="pb-1.5 text-center text-[0.6rem] tracking-[0.1em] text-ink-mute"
            >
              P{i + 1}
            </span>
          ))}

          {drivers.map((d) => (
            <Row key={d.driverId} code={d.code} color={d.color} probs={d.probs} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({
  code,
  color,
  probs,
}: {
  code: string;
  color?: string;
  probs: number[];
}) {
  return (
    <>
      <span className="flex items-center gap-1.5 pr-2 text-ink-dim">
        {/* The constructor stripe, the same identity mark every driver row on
            the site carries (§7.6). */}
        <span
          className="h-3 w-0.5 shrink-0"
          style={{ background: color ?? "var(--color-ink-mute)" }}
        />
        {code}
      </span>
      {Array.from({ length: COLS }, (_, i) => {
        const p = probs[i] ?? 0;
        return (
          <span
            key={i}
            className="py-1.5 text-center text-ink"
            style={{ background: fillFor(p) }}
          >
            {/* Under one percent the cell prints nothing: a column of `0`s is
                a column of noise, and the tint already says "never". */}
            {p >= 0.01 ? Math.round(p * 100) : ""}
          </span>
        );
      })}
    </>
  );
}
