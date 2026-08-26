import type { CircuitTrace as Trace } from "@/lib/circuits";

/**
 * The circuit as a corner bleed — the phone's half of the trace.
 *
 * Below `lg` the race card sits under the buttons, which is where nobody looks
 * and no ornament earns its keep. Here the same geometry runs in from the
 * top-right corner instead, oversized and cropped by the hero's own frame,
 * with the red glow behind it. That corner is exactly where the old aurora
 * blob used to be; this is the same gesture with real geometry in place of a
 * blur.
 *
 * **Two masks, nested rather than composited.** One fades the drawing out
 * leftwards so it never reaches the column the text starts in; the other fades
 * it out downwards so it stops above the headline. Together they confine it to
 * the top-right quarter — a few curves on the right, which is all it should be
 * when it is decoration rather than data. Nesting avoids `mask-composite`,
 * which still needs a vendor-prefixed second spelling to work everywhere.
 *
 * It is `aria-hidden` and carries no caption: the line above the headline
 * already names the round and the Grand Prix, and a corner count beside a
 * countdown is clutter. The labelled version is `HeroRaceCard`, from `lg` up.
 */
export default function HeroTraceBleed({ trace }: { trace: Trace }) {
  const { path, width, height } = trace;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
      style={{
        maskImage: "linear-gradient(to left, #000 0%, #000 30%, transparent 76%)",
        WebkitMaskImage:
          "linear-gradient(to left, #000 0%, #000 30%, transparent 76%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, #000 0%, #000 14%, transparent 38%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 14%, transparent 38%)",
        }}
      >
        {/* The glow rides with the drawing, so the hero still has exactly one
            light source and it is still behind the thing it lights. */}
        <div
          className="absolute -top-[30vw] -right-[24vw] h-[86vw] w-[86vw]"
          style={{
            background:
              "radial-gradient(closest-side, rgb(255 30 60 / 0.3), rgb(255 30 60 / 0.07) 58%, transparent 78%)",
          }}
        />
        {/* A fixed box, and the drawing hung from its top-right corner.

            Scaling by width alone does not survive the calendar: Monza is two
            and a third times wider than it is tall and the Hungaroring is
            taller than it is wide, so one `w-[105vw]` gives a band across the
            corner in September and a single vertical edge in July. A box with
            `preserveAspectRatio="xMaxYMin meet"` sizes every circuit to fit
            and pins the same corner of it off-screen, so each one bleeds the
            same way and none of them arrives as a stray line. */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMaxYMin meet"
          className="absolute -top-8 -right-[20vw] h-[44vh] w-[110vw] max-w-none text-ink-dim opacity-50"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
