import { formatPoints } from "@/lib/format";
import { tint } from "@/lib/teams";

export interface CurvePoint {
  round: number;
  /** Cumulative player points after that round. */
  you: number;
  /** Cumulative model points over the same races. */
  model: number;
  /** That weekend's duel, drawn as a marker on the last five points. */
  outcome?: "W" | "D" | "L";
}

/** Height of the plot in user units. The width is always 100. */
const H = 40;
const PAD = 2;

/**
 * The season, as two lines: your running total against the model's over the
 * same races.
 *
 * Hand-drawn SVG rather than a charting library — it is two polylines, and the
 * whole site ships no chart dependency. `preserveAspectRatio="none"` lets the
 * plot stretch to whatever width it lands in; `vector-effect` keeps the strokes
 * an honest 1px through that stretch instead of smearing them.
 *
 * **The last five duels are marked on the line.** They used to be a separate
 * strip of five coloured pills above it — a summary of the list that followed,
 * drawn in the last capsules left on the site. A win, a draw and a loss are
 * three states (§3.2), and here they sit exactly where they happened: on the
 * point where the curve moved. The markers are circles because they are dots
 * on a plot, which is one of the shapes §5.4 lets stay round.
 *
 * It also lost its `glass-card`. It sits in the season block beside the duel
 * history now, and a card around a chart that is already framed by its own
 * axis is the surface-on-surface habit M-3 removed on `/model`.
 */
export default function PointsCurve({
  points,
  color,
}: {
  points: CurvePoint[];
  color: string;
}) {
  // One point is a dot, not a curve. The caller shows nothing at all until a
  // second race has been scored.
  if (points.length < 2) return null;

  const ceiling = Math.max(
    1,
    ...points.map((p) => Math.max(p.you, p.model)),
  );
  const x = (i: number) => (i / (points.length - 1)) * 100;
  const y = (v: number) => PAD + (H - 2 * PAD) * (1 - v / ceiling);

  const line = (pick: (p: CurvePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pick(p))}`).join(" ");

  const you = points[points.length - 1].you;
  const model = points[points.length - 1].model;
  const ahead = you - model;

  // Only the tail is marked: five is what a form strip showed, and a dot on
  // every round of a 24-race season is a dotted line, not a signal.
  const marked = points.slice(-5);
  const markerTone = (o: CurvePoint["outcome"]) =>
    o === "W" ? "#34d399" : o === "D" ? "#fbbf24" : "var(--color-race)";

  return (
    <figure className="m-0">
      {/* No heading of its own: the block this sits in is already called "The
          season", and two labels a centimetre apart is the mistake the profile
          made three times over. What is left is the key. */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="flex items-center gap-4 text-xs text-ink-mute">
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-4"
              style={{ background: color }}
            />
            You {formatPoints(you)}
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-4 border-t border-dashed border-ink-mute"
            />
            Model {formatPoints(model)}
          </span>
        </div>
      </div>

      <div className="relative mt-5">
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`After ${points.length} races: you ${formatPoints(you)} points, the model ${formatPoints(model)}.`}
        className="block h-36 w-full sm:h-44"
      >
        <defs>
          <linearGradient id="curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2="100"
            y1={PAD + (H - 2 * PAD) * f}
            y2={PAD + (H - 2 * PAD) * f}
            stroke="rgb(255 255 255 / 0.07)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path
          d={`${line((p) => p.you)} L100,${H} L0,${H} Z`}
          fill="url(#curve-fill)"
        />
        <path
          d={line((p) => p.model)}
          fill="none"
          stroke={tint("#a7adba", 0.75)}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={line((p) => p.you)}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

      </svg>

      {/* The form, on the line — and drawn in HTML rather than in the SVG.
          `preserveAspectRatio="none"` stretches the viewBox to the container,
          which turns any <circle> into an ellipse; a positioned span is a
          circle at every width. The percentages are the same numbers the path
          is built from, so the dots sit exactly on their points. */}
      {marked.map((p) => {
        const i = points.indexOf(p);
        return (
          <span
            key={p.round}
            aria-hidden
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${x(i)}%`,
              top: `${(y(p.you) / H) * 100}%`,
              background: markerTone(p.outcome),
              boxShadow: "0 0 0 2px var(--color-bg)",
            }}
          />
        );
      })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-ink-mute">
        <span className="font-mono">R{points[0].round}</span>
        <span>
          {ahead === 0 ? (
            "Dead level with the model"
          ) : (
            <>
              <span
                className={ahead > 0 ? "text-emerald-400" : "text-race"}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {ahead > 0 ? "+" : "−"}
                {formatPoints(Math.abs(ahead))}
              </span>{" "}
              {ahead > 0 ? "ahead of the model" : "behind the model"}
            </>
          )}
        </span>
        <span className="font-mono">R{points[points.length - 1].round}</span>
      </div>
    </figure>
  );
}
