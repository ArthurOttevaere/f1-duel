/**
 * What calibration did, as a picture.
 *
 * The most interesting decision in the whole project — the model does not play
 * its raw ML order, it plays an order blended with a historical
 * P(finish | grid) prior (`GAME_DESIGN` §2.2) — was a single grey sentence at
 * the bottom of a card: "a grid-copying human went from 8–0–3 down to 3–5–3".
 * That sentence is the proof the duel is winnable but not lazily winnable, and
 * nobody reads a proof set in 12px mute.
 *
 * So it is drawn: two tracks, one per version of the opponent, eleven blocks
 * each because 2026 has eleven scored Grands Prix, grouped by outcome rather
 * than run in calendar order — this is a tally, not a season. The eye compares
 * the two runs of green and the argument lands before the sentence does.
 *
 * **The tones are a qualifying screen's** (§3.2, the timing set): purple is
 * the fastest anyone has gone, green a personal best, yellow slower than that.
 * A W/D/L triple has no order of its own — emerald/amber/red are three
 * categories that happen to sit side by side — where the mini-sector colours
 * are a scale the sport has already taught every viewer to read best → worst
 * at a glance. So the weekends the grid-copier wins are purple, the draws
 * green, the ones the model takes yellow.
 *
 * The one thing it costs: red means "the model winning" everywhere else on the
 * site, and here the model's weekends are yellow. That is the trade, and it is
 * why the three colours may only ever appear together as this scale — a lone
 * purple block somewhere else would mean nothing.
 *
 * Colour is never the only channel (§1.2): every row prints its own record,
 * and the legend names the three tones in words.
 */

interface DuelRecord {
  label: string;
  note: string;
  /** Weekends the grid-copier won, drew, lost. Their sum is the season. */
  won: number;
  drawn: number;
  lost: number;
}

const RECORDS: DuelRecord[] = [
  {
    label: "Raw model order",
    note: "The ensemble's most likely top 10, played as-is",
    won: 8,
    drawn: 0,
    lost: 3,
  },
  {
    label: "Calibrated entry",
    note: "Blended with the grid prior — what it actually plays",
    won: 3,
    drawn: 5,
    lost: 3,
  },
];

const TONES = [
  { key: "won", fill: "bg-sector-purple", legend: "Copying the grid won" },
  { key: "drawn", fill: "bg-sector-green", legend: "Draw" },
  { key: "lost", fill: "bg-sector-yellow", legend: "The model won" },
] as const;

export default function CalibrationRecord({
  className = "",
}: {
  className?: string;
}) {
  return (
    <figure className={className}>
      <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
        Grid-copier vs the model · 2026
      </p>

      <div className="mt-5 border-b border-line">
        {RECORDS.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-3 border-t border-line py-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_5rem] sm:items-center sm:gap-x-8"
          >
            <div className="min-w-0">
              <span className="font-mono text-[0.65rem] tracking-[0.18em] text-ink uppercase">
                {r.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-mute">
                {r.note}
              </span>
            </div>

            {/* One block per Grand Prix. Square ends and a 3px gap: eleven
                weekends you can count, not a stacked bar you have to trust. */}
            <div aria-hidden className="order-last flex h-2.5 gap-[3px] sm:order-none">
              {TONES.map((t) =>
                Array.from({ length: r[t.key] }).map((_, i) => (
                  <span
                    key={`${t.key}-${i}`}
                    className={`block h-full flex-1 ${t.fill}`}
                  />
                )),
              )}
            </div>

            <p className="font-mono text-lg font-semibold tabular-nums sm:text-right sm:text-xl">
              {r.won}–{r.drawn}–{r.lost}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {TONES.map((t) => (
          <span
            key={t.key}
            className="flex items-center gap-2 text-xs text-ink-mute"
          >
            <span aria-hidden className={`block h-1.5 w-4 ${t.fill}`} />
            {t.legend}
          </span>
        ))}
      </div>

      <figcaption className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-dim">
        Eleven Grands Prix, replayed against a human who does nothing but copy
        the starting grid. Against the raw model that human wins eight of them;
        against the calibrated entry, three — with five weekends too close to
        separate. Calibration is what turned a beatable opponent into a coin
        flip, and boldness is what is left to beat it with.
      </figcaption>
    </figure>
  );
}
