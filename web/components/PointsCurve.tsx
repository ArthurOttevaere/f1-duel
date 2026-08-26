import { formatPoints } from "@/lib/format";
import { tint } from "@/lib/teams";

export interface CurvePoint {
  round: number;
  /** Cumulative player points after that round. */
  you: number;
  /** Cumulative model points over the same races. */
  model: number;
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

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-ink-dim">
          SEASON CURVE
        </h2>
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

      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`After ${points.length} races: you ${formatPoints(you)} points, the model ${formatPoints(model)}.`}
        className="mt-5 h-36 w-full sm:h-44"
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
    </div>
  );
}
