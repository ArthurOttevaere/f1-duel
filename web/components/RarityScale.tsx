import { RARITY_TIERS } from "@/lib/bands";

/**
 * The rarity multiplier, drawn in the matrix's own bands.
 *
 * It is the heart of the game and its only picture on `/rules` was four rows
 * of a table: "≥ 30% → ×1". But the picture already existed one page away —
 * the bands of `ProbabilityGrid` *are* these four thresholds (`lib/bands.ts`,
 * `GAME_DESIGN` §2.2). Drawing the rule with the chart's colours makes the two
 * pages one idea instead of two descriptions of it (§1.1).
 *
 * Read down, the fill fades and the multiplier climbs: **colour is how sure
 * the model was, and the pale end is where the points are.** That inverse is
 * the whole game and no sentence states it as fast as four bars do.
 *
 * The fill stops short of the multiplier, exactly as it does in the matrix's
 * rows: ×3 is drawn in race red and a full-strength red bar swallowed it
 * whole. Text on a band is light ink at every band — the contrast note lives
 * with the bands themselves.
 */
export default function RarityScale({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <dl>
        {RARITY_TIERS.map((t) => (
          <div
            key={t.range}
            className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-stretch gap-3 border-t border-line py-2 last:border-b sm:grid-cols-[minmax(0,1fr)_4.5rem] sm:gap-4"
          >
            {/* The band, carrying its own label — the shape of a matrix row.
                Square ends (§5.4): a timing bar has no caps. */}
            <dt
              className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-start sm:gap-3"
              style={{ background: t.fill }}
            >
              <span className="font-mono text-xs font-semibold tracking-wide text-ink tabular-nums sm:w-24 sm:shrink-0">
                {t.range}
              </span>
              <span className="text-xs leading-snug text-ink sm:text-sm">
                {t.note}
              </span>
            </dt>
            <dd className="flex items-center justify-end font-mono text-lg font-semibold text-race tabular-nums sm:text-xl">
              {t.mult}
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-4 text-xs leading-relaxed text-ink-mute">
        The band is what the model gave your driver for that exact position,
        frozen when the race locked — the same colour it wears on{" "}
        <span className="text-ink-dim">the matrix</span>. Colour is how sure the
        model was, so the pale end is where the points are.
      </figcaption>
    </figure>
  );
}
