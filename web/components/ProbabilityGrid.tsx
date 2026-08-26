"use client";

import { useMemo, useState } from "react";
import { DriverAvatar } from "@/components/DriverChip";
import { NEUTRAL_COLOR } from "@/lib/teams";

/**
 * The model's position-probability matrix — two readings of one dataset.
 *
 * This is the most impressive thing the system produces and it had never been
 * shown: /model described a 10,000-run Monte-Carlo simulation entirely in
 * prose. One cell is P(this driver finishes in exactly this position), frozen
 * at lock time — the same numbers the rarity multiplier is computed from.
 *
 * **The bands are the game's own multiplier tiers** (GAME_DESIGN §2.2), not a
 * generic ramp. That is the whole point of the chart: colour intensity is the
 * model's confidence, and because the multiplier runs the other way, the pale
 * end is exactly where the points are. The rule and the data are the same
 * picture.
 *
 * ## Why there are two of these
 *
 * A twenty-by-ten heat map needs two hundred cells laid out at once, and a
 * phone gives it 21rem. Every cell was 26px wide, too narrow for its own
 * number, so the phone got the colour and nothing else — a wall of red with
 * no values, no headers it could hold onto, and no way to compare anything.
 * Colour was the only channel, which is the one thing a chart may never do.
 *
 * So the phone doesn't get a smaller matrix, it gets a different cut of it:
 * **one position at a time, as a ranked bar list.** That is also the shape of
 * the question a player actually asks — "who does the model think finishes
 * third, and what does calling it pay?" — and the shape of the thing they are
 * about to do, which is fill P1…P10 with names. The desktop table keeps the
 * whole-matrix overview, where there is room for it.
 *
 * Both are sequential, one hue, low→high — never a rainbow — and both print
 * the value as text next to the colour.
 */

export interface GridDriver {
  driverId: string;
  code: string;
  name: string;
  /** Constructor colour, for the identity stripe on the phone list. */
  color?: string;
  /** Probabilities for P1…P10, already sliced. */
  probs: number[];
}

/**
 * Probability floor, then the tier it falls in. Highest band first.
 *
 * Every band carries light ink, checked rather than guessed: the strongest
 * fill composites to about #e11b36 on this surface, which is 4.9:1 against
 * #f4f6fa and only 4.0:1 against the page black — so the "obvious" dark-text
 * treatment for a bright cell is the worse one here, and the middle band
 * (#8f1426) is not close: 10:1 light, 1.9:1 dark.
 */
const BANDS = [
  { min: 0.3, mult: "×1", label: "30%+", fill: "rgb(255 30 60 / 0.88)", ink: "text-ink" },
  { min: 0.15, mult: "×1.5", label: "15–30%", fill: "rgb(255 30 60 / 0.55)", ink: "text-ink" },
  { min: 0.05, mult: "×2", label: "5–15%", fill: "rgb(255 30 60 / 0.3)", ink: "text-ink" },
  { min: 0.02, mult: "×3", label: "2–5%", fill: "rgb(255 30 60 / 0.14)", ink: "text-ink-dim" },
  { min: 0, mult: "×3", label: "under 2%", fill: "rgb(255 255 255 / 0.03)", ink: "text-ink-mute" },
] as const;

const bandFor = (p: number) => BANDS.find((b) => p >= b.min) ?? BANDS[BANDS.length - 1];

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** Under this, the phone list stops printing rows and starts counting them. */
const TAIL_FLOOR = 0.01;
/** …unless that would leave a stub. A field this flat is worth seeing. */
const MIN_ROWS = 6;

// ─── Phone: one position, as a ranked bar list ───────────────────────────────

function PositionList({
  drivers,
  positions,
  modelOrder,
}: {
  drivers: GridDriver[];
  positions: number;
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
    <div className="glass-card p-3 sm:hidden">
      {/* Every position on screen at once. A ten-chip rail would have to
          scroll sideways, and iOS draws no bar for that — the same trap the
          race breakdown and the standings board were both pulled out of. */}
      {/* Toggle buttons, not `role="tablist"`: the tab pattern owes the reader
          an `aria-controls` and a real tabpanel, and half a pattern announces
          worse than none. `aria-pressed` says exactly what this is. */}
      <div role="group" aria-label="Finishing position" className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: positions }, (_, i) => i + 1).map((c) => {
          const on = c === position;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => setPosition(c)}
              className={`pressable h-10 rounded-control border font-mono text-sm transition-colors ${
                on
                  ? "border-race bg-race font-semibold text-white"
                  : "border-line bg-glass text-ink-dim"
              }`}
            >
              P{c}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-dim">
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
              className={`relative flex items-center gap-2.5 overflow-hidden rounded-control border px-2.5 py-2 ${
                isPick ? "border-race/50" : "border-line"
              }`}
            >
              {/* The bar is the row's own background, so the name sits inside
                  the quantity instead of beside a second little chart. It
                  stops short of the right gutter rather than filling the row:
                  the multiplier is drawn in the site red, and on top of a
                  full-strength red fill it disappeared completely. Reserving
                  the numbers a strip of plain card is what keeps every one of
                  them legible, whatever band the row is in. */}
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 right-[5.25rem] pr-2"
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
              {/* Full-strength ink on every row, unlike the heat map's cells:
                  there the dimming *is* the reading, here the name is the
                  identity and a 1% driver still has to be readable. The band
                  is carried by the bar behind it and the multiplier beside
                  it. */}
              <span className="relative min-w-0 flex-1 truncate text-sm text-ink">
                {d.name}
              </span>
              <span className="relative shrink-0 font-mono text-sm tabular-nums">
                {pct(d.p)}
              </span>
              <span className="relative w-9 shrink-0 text-right font-mono text-[0.65rem] text-race">
                {band.mult}
              </span>
            </li>
          );
        })}
      </ol>

      {tail > 0 && (
        <p className="mt-2 px-2.5 font-mono text-[0.7rem] text-ink-mute">
          {tail} more under 1% · <span className="text-race">×3</span> each
        </p>
      )}
    </div>
  );
}

// ─── Tablet and up: the whole matrix at once ─────────────────────────────────

function Heatmap({
  drivers,
  positions,
  onHover,
  hover,
}: {
  drivers: GridDriver[];
  positions: number;
  hover: { driver: string; position: number } | null;
  onHover: (h: { driver: string; position: number; p: number } | null) => void;
}) {
  const cols = Array.from({ length: positions }, (_, i) => i + 1);

  return (
    <div className="glass-card hidden overflow-hidden p-4 sm:block">
      <table className="w-full border-separate border-spacing-[2px]">
        <caption className="sr-only">
          For each driver, the model&apos;s probability of finishing in each of
          the top ten positions.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-32">
              <span className="sr-only">Driver</span>
            </th>
            {cols.map((c) => (
              <th
                key={c}
                scope="col"
                className="pb-1 text-center font-mono text-[0.65rem] font-medium tracking-wider text-ink-mute"
              >
                P{c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.driverId}>
              <th
                scope="row"
                className="pr-2 text-left align-middle font-mono text-xs font-medium text-ink-dim"
              >
                <span className="truncate">{d.name}</span>
              </th>
              {cols.map((c) => {
                const p = d.probs[c - 1] ?? 0;
                const band = bandFor(p);
                const on = hover?.driver === d.driverId && hover?.position === c;
                return (
                  <td key={c} className="p-0">
                    <div
                      onMouseEnter={() => onHover({ driver: d.driverId, position: c, p })}
                      onMouseLeave={() => onHover(null)}
                      title={`${d.name} · P${c} · ${pct(p)} · ${band.mult}`}
                      className={`flex h-7 items-center justify-center rounded-[4px] text-[0.6rem] transition-shadow ${band.ink} ${
                        on ? "ring-2 ring-ink/70" : ""
                      }`}
                      style={{ background: band.fill }}
                    >
                      {/* Selective labels: a number in every one of two
                          hundred cells is noise, and below 5% it rounds to
                          nothing worth reading. */}
                      <span className="font-mono">
                        {p >= 0.05 ? Math.round(p * 100) : ""}
                      </span>
                      <span className="sr-only">
                        {d.name}, P{c}, {pct(p)}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProbabilityGrid({
  drivers,
  positions = 10,
  modelOrder,
}: {
  drivers: GridDriver[];
  positions?: number;
  /** The top 10 the model actually played, so each cut can name its own pick. */
  modelOrder?: string[];
}) {
  const [hover, setHover] = useState<{
    driver: string;
    position: number;
    p: number;
  } | null>(null);

  return (
    <figure className="m-0">
      <PositionList drivers={drivers} positions={positions} modelOrder={modelOrder} />
      <Heatmap
        drivers={drivers}
        positions={positions}
        hover={hover}
        onHover={setHover}
      />

      {/* ── Legend: the bands are the multiplier tiers ──
          Tablet and up only. On the phone every row already prints its own
          multiplier next to its own bar, so the same five tiers spelled out
          underneath is a key to a chart that doesn't need one. */}
      <figcaption className="mt-4 flex flex-col gap-3">
        <div className="hidden flex-wrap items-center gap-x-4 gap-y-2 sm:flex">
          <span className="font-mono text-[0.65rem] tracking-wider text-ink-mute uppercase">
            Model&apos;s confidence
          </span>
          {BANDS.map((b) => (
            <span key={b.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-[3px]"
                style={{ background: b.fill }}
              />
              <span className="font-mono text-[0.65rem] text-ink-dim">
                {b.label}
              </span>
              <span className="font-mono text-[0.65rem] text-race">
                {b.mult}
              </span>
            </span>
          ))}
        </div>
        <p className="text-sm leading-relaxed text-ink-dim">
          {hover ? (
            <span className="font-mono text-ink">
              {drivers.find((d) => d.driverId === hover.driver)?.name} at P
              {hover.position} — {pct(hover.p)} likely, worth{" "}
              <span className="text-race">{bandFor(hover.p).mult}</span> if you
              call it and it lands.
            </span>
          ) : (
            <>
              Colour is how sure the model is. The multiplier runs the other
              way, so{" "}
              <strong className="text-ink">
                the faint end is where the points are
              </strong>{" "}
              — a call the model rated under 5% pays triple.
            </>
          )}
        </p>
      </figcaption>
    </figure>
  );
}
