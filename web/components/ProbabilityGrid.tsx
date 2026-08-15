"use client";

import { useState } from "react";

/**
 * The model's position-probability matrix, drawn as a heat map.
 *
 * This is the most impressive thing the system produces and it had never been
 * shown: /model described a 10,000-run Monte-Carlo simulation entirely in
 * prose. One cell is P(this driver finishes in exactly this position), frozen
 * at lock time — the same numbers the rarity multiplier is computed from.
 *
 * **The bands are the game's own multiplier tiers** (GAME_DESIGN §2.2), not a
 * generic ramp. That is the whole point of the chart: colour intensity is the
 * model's confidence, and because the multiplier runs the other way, the pale
 * cells are exactly where the points are. The rule and the data are the same
 * picture.
 *
 * Sequential, one hue, low→high — never a rainbow. It is a real <table> with
 * real headers, so the values are in the DOM for a screen reader and the
 * colour is never the only channel.
 */

export interface GridDriver {
  driverId: string;
  code: string;
  name: string;
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

export default function ProbabilityGrid({
  drivers,
  positions = 10,
}: {
  drivers: GridDriver[];
  positions?: number;
}) {
  const [hover, setHover] = useState<{
    driver: string;
    position: number;
    p: number;
  } | null>(null);

  const cols = Array.from({ length: positions }, (_, i) => i + 1);

  return (
    <figure className="m-0">
      <div className="glass-card overflow-hidden p-3 sm:p-4">
        <table className="w-full border-separate border-spacing-[2px]">
          <caption className="sr-only">
            For each driver, the model&apos;s probability of finishing in each
            of the top ten positions.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-10 sm:w-32">
                <span className="sr-only">Driver</span>
              </th>
              {cols.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="pb-1 text-center font-mono text-[0.6rem] font-medium tracking-wider text-ink-mute sm:text-[0.65rem]"
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
                  className="pr-2 text-left align-middle font-mono text-[0.65rem] font-medium text-ink-dim sm:text-xs"
                >
                  {/* The three-letter code on a phone: a name column wide
                      enough for "Verstappen" would push the ten cells off the
                      edge, which is the bug this project just spent a PR
                      removing. */}
                  <span className="sm:hidden">{d.code}</span>
                  <span className="hidden truncate sm:inline">{d.name}</span>
                </th>
                {cols.map((c) => {
                  const p = d.probs[c - 1] ?? 0;
                  const band = bandFor(p);
                  const on =
                    hover?.driver === d.driverId && hover?.position === c;
                  return (
                    <td key={c} className="p-0">
                      <div
                        onMouseEnter={() =>
                          setHover({ driver: d.driverId, position: c, p })
                        }
                        onMouseLeave={() => setHover(null)}
                        title={`${d.name} · P${c} · ${pct(p)} · ${band.mult}`}
                        className={`flex h-6 items-center justify-center rounded-[4px] text-[0.6rem] transition-shadow sm:h-7 ${band.ink} ${
                          on ? "ring-2 ring-ink/70" : ""
                        }`}
                        style={{ background: band.fill }}
                      >
                        {/* Selective labels: a number in every one of two
                            hundred cells is noise, and below 5% it rounds to
                            nothing worth reading. Hidden on phones, where the
                            cell is 26px wide. */}
                        <span className="hidden font-mono sm:inline">
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

      {/* ── Legend: the bands are the multiplier tiers ── */}
      <figcaption className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
                the pale cells are where the points are
              </strong>{" "}
              — a call the model rated under 5% pays triple.
            </>
          )}
        </p>
      </figcaption>
    </figure>
  );
}
