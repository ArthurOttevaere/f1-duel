/**
 * The scoring table of the home page — four numbers that used to sit in a
 * `glass-card` as four equal centred columns.
 *
 * The stat row is the second most generic block a landing page can carry, and
 * here it was also wrong: `10 pts / ×3 / +15 / +100` is not four statistics, it
 * is the four rungs of a scale, and setting them at equal weight erased the one
 * thing that matters — that a perfect top 10 is worth ten times an exact call.
 *
 * So the rule is drawn as the rule (§1.1). Each row prints its own number, and
 * a hairline the length of that number runs beside it: the +100 fills the
 * track, the 10 takes a tenth of it. No card, no axis, no chart furniture —
 * a label, a length, a value.
 *
 * `×3` is the one that cannot be plotted, because it is a multiplier and not a
 * quantity of points. It is drawn as what it actually does: the ten-point bar,
 * continued in a hollow tone up to thirty.
 */
const TIERS = [
  {
    label: "Exact position",
    note: "The driver, on the number you called",
    value: "10 pts",
    solid: 10,
    ghost: 0,
  },
  {
    label: "On a long shot",
    note: "Multiplied by how little the model believed it — up to 30",
    value: "×3",
    solid: 10,
    ghost: 20,
  },
  {
    label: "Perfect podium",
    note: "The top three, in order",
    value: "+15",
    solid: 15,
    ghost: 0,
  },
  {
    label: "Perfect top 10",
    note: "All ten, in order. It has never been done",
    value: "+100",
    solid: 100,
    ghost: 0,
  },
];

export default function ScoringScale({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-xs tracking-[0.2em] text-ink-mute uppercase">
        What a call is worth
      </p>

      <dl className="mt-6">
        {TIERS.map((t) => (
          <div
            key={t.label}
            // Three columns from `sm`: name, track, number. On a phone the
            // track drops to its own line under the pair rather than being
            // squeezed to forty pixels, where a tenth of it would be four.
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-3 border-t border-line py-5 last:border-b last:border-line sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_4.5rem] sm:items-center sm:gap-x-8"
          >
            <dt className="min-w-0">
              <span className="font-mono text-[0.65rem] tracking-[0.18em] text-ink uppercase">
                {t.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-mute">
                {t.note}
              </span>
            </dt>

            {/* Square ends, per §5.4 — a timing bar has no caps. The value is
                printed beside it either way, so the length is never the only
                channel (§1.2). */}
            <div
              aria-hidden
              className="order-last flex h-1.5 w-full sm:order-none"
            >
              <span
                className="block h-full bg-race-deep"
                style={{ width: `${t.solid}%` }}
              />
              {t.ghost > 0 && (
                <span
                  className="block h-full bg-race/25"
                  style={{ width: `${t.ghost}%` }}
                />
              )}
            </div>

            <dd className="font-mono text-lg font-semibold tabular-nums sm:text-right sm:text-xl">
              {t.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
