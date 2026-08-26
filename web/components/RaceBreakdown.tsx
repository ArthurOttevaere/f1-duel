"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPoints, multiplierLabel } from "@/lib/format";
import type { SlotScore } from "@/lib/types";

/**
 * The side-by-side table, with the scoring made inspectable.
 *
 * The table alone said "Norris +20" and left everyone guessing where the 20
 * came from — the base points, the rarity multiplier and the driver's actual
 * finish are all invisible in a grid. Picking a position opens one plain
 * explanation of that row, for your pick and the model's, and the receipts
 * underneath account for every point in the two totals.
 */

type Kind = SlotScore["kind"];

export interface BreakdownEntry {
  name: string;
  color: string;
  kind: Kind;
  /** Official finishing position, or null when the driver wasn't classified. */
  actual: number | null;
  base: number;
  /** The model's calibrated probability for this driver at this position. */
  probability: number | null;
  multiplier: number;
  points: number;
}

export interface BreakdownRow {
  position: number;
  mine: BreakdownEntry | null;
  model: BreakdownEntry | null;
  official: { name: string; color: string } | null;
}

export interface Receipt {
  slots: number;
  bonuses: Record<string, number>;
  total: number;
}

const TONE: Record<Kind, string> = {
  exact: "text-emerald-400",
  near: "text-amber-300",
  in_top10: "text-ink-dim",
  miss: "text-ink-mute",
};

const KIND_LABEL: Record<Kind, string> = {
  exact: "Exact position",
  near: "One place off",
  in_top10: "In the top 10",
  miss: "Missed",
};

const BONUS_LABEL: Record<string, string> = {
  podium: "Exact podium",
  perfect: "Perfect top 10",
  dotd: "Driver of the Day",
  safety_car: "Safety-car bet",
};

function bonusLabel(key: string, points: number): string {
  // "duel" is gone from the rules (GAME_DESIGN §2.2) and stripped from stored
  // breakdowns by migration 0007, but a receipt is read straight out of the
  // database — so this keeps labelling one if it ever turns up.
  if (key === "duel") return points >= 10 ? "Beat the model" : "Drew with the model";
  return BONUS_LABEL[key] ?? key;
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

/** "Norris finished P1 — exactly where you called them." */
function outcomeLine(
  entry: BreakdownEntry,
  position: number,
  subject: string,
  possessive: string,
): string {
  if (entry.actual === null) {
    return `${entry.name} was not classified — nothing scores from ${possessive} P${position}.`;
  }
  switch (entry.kind) {
    case "exact":
      return `${entry.name} finished P${entry.actual} — exactly where ${subject} called them.`;
    case "near":
      return `${entry.name} finished P${entry.actual}, one place off ${possessive} P${position}.`;
    case "in_top10":
      return `${entry.name} finished P${entry.actual} — inside the top 10, but not at ${possessive} P${position}.`;
    default:
      return `${entry.name} finished P${entry.actual}, outside the top 10.`;
  }
}

/** "10 base × 2 = 20 pts", and why the multiplier is what it is. */
function mathLine(entry: BreakdownEntry): string {
  if (entry.points === 0) return "0 pts";
  if (entry.multiplier > 1) {
    return `${formatPoints(entry.base)} base ${multiplierLabel(entry.multiplier)} = ${formatPoints(entry.points)} pts`;
  }
  return `${formatPoints(entry.points)} pts`;
}

function rarityLine(entry: BreakdownEntry): string | null {
  if (entry.kind !== "exact" || entry.probability === null) return null;
  return entry.multiplier > 1
    ? `The model rated that call ${pct(entry.probability)} likely, so it pays ${multiplierLabel(entry.multiplier)}.`
    : `The model rated that call ${pct(entry.probability)} likely — a favourite, so no multiplier.`;
}

function Side({
  who,
  entry,
  position,
}: {
  who: "You" | "The model";
  entry: BreakdownEntry | null;
  position: number;
}) {
  const subject = who === "You" ? "you" : "the model";
  const possessive = who === "You" ? "your" : "its";
  const mine = who === "You";
  return (
    // Each side is its own panel: stacked on a phone, the two explanations ran
    // together under labels small enough to skip, and you couldn't tell whose
    // points you were reading.
    <div className="rounded-control border border-line bg-glass p-4">
      <p className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider uppercase">
        <span
          aria-hidden
          className={`h-4 w-1 ${mine ? "bg-race" : "bg-ink-mute"}`}
        />
        <span className={mine ? "text-ink" : "text-ink-dim"}>{who}</span>
      </p>
      {!entry ? (
        <p className="mt-2 text-sm text-ink-mute">No pick for this position.</p>
      ) : (
        <>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className={`font-semibold ${TONE[entry.kind]}`}>
              {KIND_LABEL[entry.kind]}
            </span>
            <span className="font-mono text-ink-dim">{mathLine(entry)}</span>
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            {outcomeLine(entry, position, subject, possessive)}
          </p>
          {rarityLine(entry) && (
            <p className="mt-1 text-sm text-ink-mute">{rarityLine(entry)}</p>
          )}
        </>
      )}
    </div>
  );
}

function ReceiptCard({
  title,
  receipt,
}: {
  title: string;
  receipt: Receipt;
}) {
  const bonuses = Object.entries(receipt.bonuses).filter(([, v]) => v > 0);
  return (
    <div className="rounded-panel border border-line bg-glass p-5">
      <p className="font-mono text-[0.65rem] tracking-[0.2em] text-ink-mute uppercase">
        {title}
      </p>
      <dl className="mt-3 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-dim">The ten positions</dt>
          <dd className="font-mono">{formatPoints(receipt.slots)}</dd>
        </div>
        {bonuses.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4">
            <dt className="text-ink-dim">{bonusLabel(key, value)}</dt>
            <dd className="font-mono text-emerald-400">
              +{formatPoints(value)}
            </dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-line pt-2">
          <dt className="font-medium">Total</dt>
          <dd className="font-mono font-semibold">
            {formatPoints(receipt.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Columns are separated by a hairline so a score can't read as the next one's. */
const DIVIDER = "border-l border-line";

/**
 * A driver as they appear in any of the three columns: the team's colour, the
 * name toned by how the call went, and the points earned.
 *
 * `color` is passed rather than read off the entry because the official column
 * has a colour and a name but no score of its own.
 */
function DriverLine({
  name,
  color,
  tone,
  points,
  multiplier,
}: {
  name: string;
  color: string;
  tone?: string;
  points?: number;
  multiplier?: number;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-4 w-0.5 shrink-0"
        style={{ background: color }}
      />
      <span className={`truncate text-sm ${tone ?? ""}`}>{name}</span>
      {/* Pinned to the name, not to the right edge of the column: pushed
          out there it sat against the next column and read as that
          column's score. */}
      {points !== undefined && points > 0 && (
        <span className="shrink-0 rounded-control bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-dim">
          +{formatPoints(points)}
          {multiplier !== undefined && multiplier > 1 && (
            <span className="ml-1 text-race">{multiplierLabel(multiplier)}</span>
          )}
        </span>
      )}
    </span>
  );
}

function EntryLine({ entry }: { entry: BreakdownEntry | null }) {
  if (!entry) return <span className="text-sm text-ink-mute">—</span>;
  return (
    <DriverLine
      name={entry.name}
      color={entry.color}
      tone={TONE[entry.kind]}
      points={entry.points}
      multiplier={entry.multiplier}
    />
  );
}

function Cell({ entry, divider }: { entry: BreakdownEntry | null; divider?: boolean }) {
  return (
    <td className={`px-3 py-2 ${divider ? DIVIDER : ""}`}>
      <EntryLine entry={entry} />
    </td>
  );
}

/** The "?" disc that marks a row as openable, and shows it is open. */
function WhyDot({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-5 shrink-0 place-items-center rounded-full border text-[0.65rem] font-semibold transition-colors ${
        open ? "border-race bg-race text-white" : "border-line text-ink-mute"
      }`}
    >
      ?
    </span>
  );
}

export default function RaceBreakdown({
  rows,
  me,
  model,
  signedIn,
}: {
  rows: BreakdownRow[];
  me: Receipt | null;
  model: Receipt | null;
  /** Signed out there is no "you" to compare, so that whole side comes off. */
  signedIn: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const row = open === null ? null : (rows[open] ?? null);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Phone: one card per position ────────────────────────────────
          The table below asks for 36rem and a phone gives it 21, so its last
          column — Official, the actual result of the Grand Prix — sat entirely
          past the right edge, behind a sideways scroll iOS draws no bar for.
          You were left comparing two predictions against nothing. Stacked, the
          three calls read down the card and the result is always on screen. */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((r, i) => {
          const isOpen = open === i;
          return (
            <li key={r.position}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-label={`Why these points for P${r.position}?`}
                className={`glass-card flex w-full flex-col gap-2 p-3 text-left transition-colors ${
                  isOpen ? "border-race/40" : ""
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink-mute">
                    P{r.position}
                  </span>
                  <WhyDot open={isOpen} />
                </span>

                <span className="grid grid-cols-[3.6rem_1fr] items-center gap-x-2 gap-y-1.5">
                  {signedIn && (
                    <>
                      <span className="font-mono text-[0.6rem] tracking-widest text-ink-mute uppercase">
                        You
                      </span>
                      <EntryLine entry={r.mine} />
                    </>
                  )}
                  <span className="font-mono text-[0.6rem] tracking-widest text-ink-mute uppercase">
                    Model
                  </span>
                  <EntryLine entry={r.model} />
                  <span className="font-mono text-[0.6rem] tracking-widest text-ink-mute uppercase">
                    Official
                  </span>
                  {r.official ? (
                    <DriverLine
                      name={r.official.name}
                      color={r.official.color}
                    />
                  ) : (
                    <span className="text-sm text-ink-mute">—</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── Tablet and up: the side-by-side table ── */}
      <section className="glass-card hidden overflow-x-auto p-2 sm:block">
        <table
          className={`w-full border-separate border-spacing-0 ${
            signedIn ? "min-w-[36rem]" : "min-w-[28rem]"
          }`}
        >
          <thead>
            <tr className="text-left font-mono text-xs tracking-wider text-ink-mute uppercase">
              <th className="px-3 py-2 font-medium">Pos</th>
              {signedIn && (
                <th className={`px-3 py-2 font-medium ${DIVIDER}`}>You</th>
              )}
              <th className={`px-3 py-2 font-medium ${DIVIDER}`}>Model</th>
              <th className={`px-3 py-2 font-medium ${DIVIDER}`}>
                Official
                <span className="ml-2 font-sans text-[0.65rem] normal-case">
                  (no points — the result)
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isOpen = open === i;
              return (
                <tr
                  key={r.position}
                  // The whole row opens the explanation: a trigger parked in
                  // one column is a trigger half the readers never find.
                  onClick={() => setOpen(isOpen ? null : i)}
                  className={`cursor-pointer border-t border-line transition-colors ${
                    isOpen ? "bg-glass-strong" : "hover:bg-glass"
                  }`}
                >
                  <td className="w-20 px-3 py-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(isOpen ? null : i);
                      }}
                      aria-expanded={isOpen}
                      aria-label={`Why these points for P${r.position}?`}
                      className="flex items-center gap-2"
                    >
                      <span className="font-mono text-sm text-ink-mute">
                        P{r.position}
                      </span>
                      <WhyDot open={isOpen} />
                    </button>
                  </td>
                  {signedIn && <Cell entry={r.mine} divider />}
                  <Cell entry={r.model} divider />
                  <td className={`px-3 py-2 ${DIVIDER}`}>
                    {r.official ? (
                      <DriverLine
                        name={r.official.name}
                        color={r.official.color}
                      />
                    ) : (
                      <span className="text-sm text-ink-mute">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* The explanation sits outside the scrolling table on purpose: prose
          inside a 36rem-wide grid would need sideways scrolling to read on a
          phone. */}
      {row ? (
        <section className="glass-card flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-mono text-sm font-semibold tracking-wider">
              P{row.position}
              <span className="ml-2 font-sans text-xs font-normal text-ink-mute">
                where these points come from
              </span>
            </h3>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="text-sm text-ink-mute transition-colors hover:text-ink"
            >
              Close
            </button>
          </div>

          <div className={`grid gap-4 ${signedIn ? "sm:grid-cols-2" : ""}`}>
            {signedIn && (
              <Side who="You" entry={row.mine} position={row.position} />
            )}
            <Side who="The model" entry={row.model} position={row.position} />
          </div>

          <p className="border-t border-line pt-3 text-xs text-ink-mute">
            Exact position 10 · one place off 5 · anywhere else in the top 10 2
            · outside 0. Exact hits are multiplied by how unlikely the model
            thought they were —{" "}
            <Link href="/rules#rarity" className="underline hover:text-ink">
              the full rules
            </Link>
            .
          </p>
        </section>
      ) : (
        <p className="text-xs text-ink-mute">
          Tap any position to see why it scored what it scored.
        </p>
      )}

      {(me || model) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {me && <ReceiptCard title="Your race" receipt={me} />}
          {model && <ReceiptCard title="The model's race" receipt={model} />}
        </div>
      )}
    </div>
  );
}
