"use client";

import { useCallback, useRef } from "react";
import type { CircuitTrace as Trace } from "@/lib/circuits";

/** Samples along the path, in viewBox units. Enough that the nearest one is
 *  already sub-pixel at any size this thing is drawn — so a pointer move costs
 *  one pass of arithmetic and no `getPointAtLength`. */
const SAMPLES = 800;

/**
 * A circuit, drawn as one closed hairline.
 *
 * The drawing and nothing else — no caption, no facts, no clock. Those belong
 * to whatever is showing the circuit (`HeroRaceCard` today), because the same
 * shape will want a different legend on a race page than it does in a hero.
 *
 * This is the hero's ornament, and it replaced two blurred radial gradients.
 * The blobs were the site's only decoration and also its most generic gesture
 * — an "ambient glow" is the first thing any generated hero reaches for. A
 * circuit trace is the opposite: it is the most recognisable figurative asset
 * this sport has, it costs one path to render, and it *changes every second
 * Sunday*, so the decoration is a reading of the calendar rather than a
 * texture. See DESIGN.md §6.3.
 *
 * With `interactive`, a marker follows the pointer **along the track** — it
 * projects onto the nearest point of the lap rather than sitting under the
 * cursor, so it can only ever be on the circuit. See §6.3.2.
 */
export default function CircuitTrace({
  trace,
  interactive = false,
  className = "",
}: {
  trace: Trace;
  interactive?: boolean;
  className?: string;
}) {
  const { path, width, height, start, location } = trace;

  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const samples = useRef<Float64Array | null>(null);

  // Sampled on first hover, not on mount: from `lg` down this whole card is
  // `display: none`, and path geometry read from an unrendered element is not
  // something to rely on. By the time a pointer is over it, it is rendered.
  const ensureSamples = useCallback(() => {
    if (samples.current || !pathRef.current) return;
    const el = pathRef.current;
    const total = el.getTotalLength();
    if (!total) return;
    const xy = new Float64Array(SAMPLES * 2);
    for (let i = 0; i < SAMPLES; i++) {
      const p = el.getPointAtLength((i / SAMPLES) * total);
      xy[i * 2] = p.x;
      xy[i * 2 + 1] = p.y;
    }
    samples.current = xy;
  }, []);

  const move = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // A stylus or a finger has no hover to speak of, and the marker would
      // land under whatever was just tapped.
      if (e.pointerType !== "mouse") return;
      ensureSamples();
      const svg = svgRef.current;
      const dot = dotRef.current;
      const xy = samples.current;
      if (!svg || !dot || !xy) return;

      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());

      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < SAMPLES; i++) {
        const dx = xy[i * 2] - p.x;
        const dy = xy[i * 2 + 1] - p.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }

      // Written straight onto the element. React state here would re-render the
      // hero on every pointer event, and there is nothing for it to reconcile.
      dot.setAttribute(
        "transform",
        `translate(${xy[best * 2]} ${xy[best * 2 + 1]})`,
      );
      dot.style.opacity = "1";
    },
    [ensureSamples],
  );

  const leave = useCallback(() => {
    if (dotRef.current) dotRef.current.style.opacity = "0";
  }, []);

  // The tick sits across the track, so it is drawn along the lap's heading and
  // then turned a right angle. `vector-effect` keeps every line a true hairline
  // whatever size the SVG ends up: this is a technical drawing, and a technical
  // drawing's line weight does not scale with the paper.
  const tick = Math.max(width, height) * 0.035;
  const r = Math.max(width, height) * 0.009;

  return (
    <div className={`relative ${className}`}>
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
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-ink-dim"
        role="img"
        aria-label={`Circuit layout: ${location}`}
        {...(interactive
          ? { onPointerMove: move, onPointerLeave: leave, onPointerDown: leave }
          : {})}
      >
        <path
          ref={pathRef}
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

        {interactive && (
          // The marker: a lit dot, plus a wider soft ring so it reads as a car
          // on a timing map rather than as a cursor that got stuck.
          <g
            ref={dotRef}
            aria-hidden
            className="transition-opacity duration-150"
            style={{ opacity: 0 }}
          >
            <circle r={r * 3.2} fill="var(--color-race)" opacity={0.18} />
            <circle r={r} fill="var(--color-race)" />
          </g>
        )}
      </svg>
    </div>
  );
}
