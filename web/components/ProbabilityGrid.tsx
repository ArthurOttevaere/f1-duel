"use client";

import { useMemo, useState } from "react";
import { DriverAvatar } from "@/components/DriverChip";
import { NEUTRAL_COLOR } from "@/lib/teams";

/**
 * The model's position-probability matrix, read one position at a time.
 *
 * This is the most impressive thing the system produces and it had never been
 * shown: /model described a 10,000-run Monte-Carlo simulation entirely in
 * prose. One number is P(this driver finishes in exactly this position),
 * frozen at lock time — the same numbers the rarity multiplier is computed
 * from.
 *
 * **The bands are the game's own multiplier tiers** (GAME_DESIGN §2.2), not a
 * generic ramp. That is the whole point of the chart: colour intensity is the
 * model's confidence, and because the multiplier runs the other way, the pale
 * end is exactly where the points are. The rule and the data are the same
 * picture.
 *
 * ## Why there is only one of these now
 *
 * There used to be two cuts. Above `sm:` a twenty-by-ten heat map — two
 * hundred cells at once, the whole matrix — and below it, because a phone
 * gives that 21rem and every cell came out 26px wide, too narrow for its own
 * number, a different cut: **one position at a time, as a ranked bar list.**
 *
 * The phone cut turned out to be the better chart at every width, and the
 * desktop one is gone. Two hundred cells is an impressive object and a poor
 * read: to answer "who does the model think finishes third, and what does
 * calling it pay?" you had to find a column, scan it against four tints and
 * then look up the tint in a legend. The list answers it in one glance, sorted,
 * with the percentage and the multiplier printed on every row — and it is the
 * shape of the thing the player is about to do, which is fill P1…P10 with
 * names.
 *
 * So this is not a phone twin (§1.5) any more. It is one chart that uses the
 * width it is given: the ten positions are a 5×2 pad on a phone and a vertical
 * timing-tower rail from `sm:` up, and the list sits beside it.
 */

export interface GridDriver {
  driverId: string;
  code: string;
  name: string;
  /** Constructor colour, for the identity stripe on each row. */
  color?: string;
  /** Probabilities for P1…P10, already sliced. */
  probs: number[];
}

/**
 * Probability floor, then the tier it falls in. Highest band first.
 *
 * The row's text sits *on top of* its own fill, so the contrast was checked
 * rather than guessed: the strongest fill composites to about #e11b36 on this
 * surface, which is 4.9:1 against #f4f6fa and only 4.0:1 against the page
 * black — the "obvious" dark-text treatment for a bright band is the worse one
 * here, and the middle band (#8f1426) is not close: 10:1 light, 1.9:1 dark.
 * Every row is light ink for that reason, at every band.
 */
const BANDS = [
  { min: 0.3, mult: "×1", fill: "rgb(255 30 60 / 0.88)" },
  { min: 0.15, mult: "×1.5", fill: "rgb(255 30 60 / 0.55)" },
  { min: 0.05, mult: "×2", fill: "rgb(255 30 60 / 0.3)" },
  { min: 0.02, mult: "×3", fill: "rgb(255 30 60 / 0.14)" },
  { min: 0, mult: "×3", fill: "rgb(255 255 255 / 0.03)" },
] as const;

const bandFor = (p: number) => BANDS.find((b) => p >= b.min) ?? BANDS[BANDS.length - 1];

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Under this, the list stops printing rows and starts counting them. */
const TAIL_FLOOR = 0.01;
/** …unless that would leave a stub. A field this flat is worth seeing. */
const MIN_ROWS = 6;

export default function ProbabilityGrid({
  drivers,
  positions = 10,
  modelOrder,
}: {
  drivers: GridDriver[];
  positions?: number;
  /** The top 10 the model actually played, so the list can name its own pick. */
  modelOrder?: string[];
}) {
  const [position, setPosition] = useState(1);

  const ranked = useMemo(
    () =>
      drivers
        .map((d) => ({ ...d, p: d.probs[position - 1] ?? 0 }))
        .sort((a, b) => b.p - a.p),
    [drivers, position],
  );

  // Bars are scaled against the leader of *this* position, not against 100%:
  // a field where nobody clears 20% would otherwise draw ten stubs. The number
  // beside every bar is the absolute one, and it is the primary channel — the
  // bar is there to make the shape of the column readable at a glance.
  const lead = ranked[0]?.p ?? 0;
  const shown = ranked.slice(
    0,
    Math.max(ranked.filter((d) => d.p >= TAIL_FLOOR).length, MIN_ROWS),
  );
  const tail = ranked.length - shown.length;
  const picked = modelOrder?.[position - 1];

  return (
    <figure className="m-0">
      <div className="glass-card p-3 sm:p-4">
        <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
          {/* Every position on screen at once, at every width. A ten-chip rail
              that scrolled sideways was never an option — iOS draws no bar for
              overflow, the same trap the race breakdown and the standings
              board were both pulled out of — so the phone gets a 5×2 pad. From
              `sm:` up the same ten stack into a column, which is what a timing
              tower is, and the selected one stays level with its own list.

              Toggle buttons, not `role="tablist"`: the tab pattern owes the
              reader an `aria-controls` and a real tabpanel, and half a pattern
              announces worse than none. `aria-pressed` says exactly what this
              is. */}
          <div
            role="group"
            aria-label="Finishing position"
            // `self-start` is load-bearing from `sm:` up: the rail is a grid
            // item stretched to the height of the list beside it, and a grid
            // whose rows have nowhere to go stretches them — which spaced ten
            // fixed-height buttons out across six hundred pixels with gaps
            // that meant nothing.
            className="grid grid-cols-5 gap-1.5 sm:w-16 sm:grid-cols-1 sm:gap-1 sm:self-start"
          >
            {Array.from({ length: positions }, (_, i) => i + 1).map((c) => {
              const on = c === position;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPosition(c)}
                  className={`pressable h-10 rounded-control border font-mono text-sm transition-colors sm:h-9 ${
                    on
                      ? // A resting red fill is `race-deep`, not `race` (§3.1):
                        // #ff1e3c on white is 3.8:1 and fails AA for a label
                        // this small. It was `race` while this control only
                        // existed on the phone cut, where it was one chip
                        // among ten; it is the chart's primary control now.
                        "border-race bg-race-deep font-semibold text-white"
                      : "border-line bg-glass text-ink-dim hover:border-line-hi hover:text-ink"
                  }`}
                >
                  P{c}
                </button>
              );
            })}
          </div>

          <div className="min-w-0">
            <p
              // The one line that says what is being read. It carries the
              // interpretation rather than restating the title (§12.4).
              aria-live="polite"
              className="text-sm leading-relaxed text-ink-dim"
            >
              Out of 10,000 simulated races, how often each driver finished{" "}
              <span className="font-mono text-ink">P{position}</span>
              {picked && (
                <>
                  {" "}
                  — the model played{" "}
                  <span className="text-ink">
                    {drivers.find((d) => d.driverId === picked)?.name ?? "—"}
                  </span>{" "}
                  here
                </>
              )}
              .
            </p>

            <ol className="mt-3 flex flex-col gap-1.5">
              {shown.map((d) => {
                const band = bandFor(d.p);
                const isPick = d.driverId === picked;
                return (
                  <li
                    key={d.driverId}
                    className={`relative flex items-center gap-2.5 overflow-hidden rounded-control border px-2.5 py-2 sm:gap-3 sm:px-3 ${
                      isPick ? "border-race/50" : "border-line"
                    }`}
                  >
                    {/* The bar is the row's own background, so the name sits
                        inside the quantity instead of beside a second little
                        chart. It stops short of the right gutter rather than
                        filling the row: the multiplier is drawn in the site
                        red, and on top of a full-strength red fill it
                        disappeared completely. Reserving the numbers a strip
                        of plain card is what keeps every one of them legible,
                        whatever band the row is in. */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 right-[5.25rem] pr-2 sm:right-[7.5rem]"
                    >
                      <span
                        className="block h-full"
                        style={{
                          width: `${lead > 0 ? Math.max(2, (d.p / lead) * 100) : 2}%`,
                          background: band.fill,
                        }}
                      />
                    </span>
                    <span
                      aria-hidden
                      className="relative h-7 w-1 shrink-0"
                      style={{ background: d.color ?? NEUTRAL_COLOR }}
                    />
                    <span className="relative shrink-0">
                      <DriverAvatar
                        driver={{
                          driver_id: d.driverId,
                          code: d.code,
                          team_color: d.color ?? null,
                        }}
                        size={26}
                      />
                    </span>
                    {/* Full-strength ink on every row: the name is the
                        identity, and a 1% driver still has to be readable. The
                        band is carried by the bar behind it and the multiplier
                        beside it. */}
                    <span className="relative min-w-0 flex-1 truncate text-sm text-ink">
                      {d.name}
                    </span>
                    {/* Fixed width, right-aligned: `tabular-nums` lines up
                        digits but not string lengths, so "7%" beside "27%"
                        shifted the multiplier column by a character. */}
                    <span className="relative w-10 shrink-0 text-right font-mono text-sm tabular-nums sm:w-12 sm:text-base">
                      {pct(d.p)}
                    </span>
                    <span className="relative w-9 shrink-0 text-right font-mono text-[0.65rem] text-race sm:w-14 sm:text-xs">
                      {band.mult}
                    </span>
                  </li>
                );
              })}
            </ol>

            {tail > 0 && (
              <p className="mt-2 px-2.5 font-mono text-[0.7rem] text-ink-mute">
                {tail} more under 1% · <span className="text-race">×3</span>{" "}
                each
              </p>
            )}
          </div>
        </div>
      </div>

      {/* The five-swatch legend went with the heat map. Every row prints its
          own multiplier beside its own bar, so a key spelling out the same
          five tiers underneath is a key to a chart that does not need one.
          What stays is the sentence — what the pale end means (§12.4). */}
      <figcaption className="mt-4 text-sm leading-relaxed text-ink-dim">
        Colour is how sure the model is. The multiplier runs the other way, so{" "}
        <strong className="text-ink">the faint end is where the points are</strong>{" "}
        — a call the model rated under 5% pays triple.
      </figcaption>
    </figure>
  );
}
