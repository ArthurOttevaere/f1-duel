import type { CircuitTrace as Trace } from "@/lib/circuits";

/**
 * The next Grand Prix's circuit, drawn as a single hairline.
 *
 * This is the hero's ornament, and it replaced two blurred radial gradients.
 * The blobs were the site's only decoration and also its most generic gesture
 * — an "ambient glow" is the first thing any generated hero reaches for. A
 * circuit trace is the opposite: it is the most recognisable figurative asset
 * this sport has, it costs one path to render, and it *changes every second
 * Sunday*, so the decoration is a reading of the calendar rather than a
 * texture. See DESIGN.md §6.3.
 *
 * Drawn as content, not as wallpaper: full contrast, the start/finish line
 * marked in red, and a mono caption naming what you are looking at. A trace at
 * six per cent behind the headline would have been the aurora again with extra
 * steps.
 */
export default function CircuitTrace({
  trace,
  round,
  className = "",
}: {
  trace: Trace;
  round?: number | null;
  className?: string;
}) {
  const { path, width, height, start, location, corners } = trace;

  // The tick sits across the track, so it is drawn along the lap's heading and
  // then turned a right angle. `vector-effect` keeps every line a true hairline
  // whatever size the SVG ends up: this is a technical drawing, and a technical
  // drawing's line weight does not scale with the paper.
  const tick = Math.max(width, height) * 0.035;

  const caption = [
    location.toUpperCase(),
    round ? `Round ${round}` : null,
    `${corners} corners`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <figure className={`flex flex-col items-start gap-3 ${className}`}>
      <div className="relative w-full">
        {/* The hero's one light source, moved out of the corner and put behind
            the thing it is lighting. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[-18%] -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(closest-side, rgb(255 30 60 / 0.26), rgb(255 30 60 / 0.06) 58%, transparent 78%)",
          }}
        />
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full text-ink-dim"
          role="img"
          aria-label={`Circuit layout: ${location}`}
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <g transform={`translate(${start.x} ${start.y}) rotate(${start.angle})`}>
            <line
              x1={0}
              y1={-tick / 2}
              x2={0}
              y2={tick / 2}
              stroke="var(--color-race)"
              strokeWidth={2.5}
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </div>

      <figcaption className="font-mono text-[0.6rem] tracking-[0.18em] text-ink-mute uppercase sm:text-[0.65rem]">
        {caption}
      </figcaption>
    </figure>
  );
}
