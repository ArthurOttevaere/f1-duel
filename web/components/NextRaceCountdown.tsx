"use client";

import { useEffect, useState } from "react";

function remaining(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    ms,
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The two coarsest units that are not zero: `2d 14h`, then `14h 06m`, then
 * `06m 22s`. A clock that reads "0d 14h" on race morning is a clock nobody
 * finished, and on one line of 10px type there is no room to say more.
 */
function coarse(l: ReturnType<typeof remaining>): string {
  if (l.d > 0) return `${l.d}d ${pad(l.h)}h`;
  if (l.h > 0) return `${l.h}h ${pad(l.m)}m`;
  return `${l.m}m ${pad(l.s)}s`;
}

function Column({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* tabular-nums so the digits keep their box as they tick — without it
          the whole row twitches once a second on proportional figures. */}
      <span className="font-mono text-2xl font-semibold tabular-nums">
        {value}
      </span>
      <span className="font-mono text-[0.55rem] tracking-[0.18em] text-ink-mute uppercase">
        {unit}
      </span>
    </div>
  );
}

function Colon() {
  return (
    <span aria-hidden className="mt-0.5 font-mono text-xl text-ink-mute">
      :
    </span>
  );
}

/**
 * The clock, in the two shapes the hero needs.
 *
 * `tower` — four columns of digits separated by colons, under the circuit in
 * the race card. It is a lap board, and it is the only place on the site where
 * a number is allowed to be this large.
 *
 * `inline` — one run of type for the phone line above the headline, where the
 * card sits below the fold. Coarse units, so it settles once a minute instead
 * of ticking under a headline.
 *
 * Deliberately unanimated in both: this updates once a second, forever, and
 * anything that moved on each tick would be noise rather than polish.
 */
export default function NextRaceCountdown({
  to,
  variant = "tower",
  className = "",
}: {
  to: string;
  variant?: "tower" | "inline";
  className?: string;
}) {
  const target = new Date(to).getTime();
  // Null until mounted: the server has no clock that agrees with the client's,
  // and a mismatch here would be a hydration error.
  const [left, setLeft] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only first tick
    setLeft(remaining(target));
    const id = setInterval(() => setLeft(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (variant === "inline") {
    // Same width as the real thing, so hydration swaps the digits in without
    // moving the line around them.
    return (
      <span
        className={`font-mono tabular-nums text-ink ${className}`}
        {...(left && left.ms > 0
          ? {
              role: "timer",
              "aria-label": `${left.d} days, ${left.h} hours until the race`,
            }
          : { "aria-hidden": true })}
      >
        {!left ? "--d --h" : left.ms === 0 ? "lights out" : coarse(left)}
      </span>
    );
  }

  if (left && left.ms === 0) {
    return (
      <p className="display text-2xl font-extrabold tracking-tight text-race uppercase">
        Lights out
      </p>
    );
  }

  // Same shape and width as the real thing, so hydration swaps the digits in
  // without shifting a single pixel around them.
  const l = left ?? null;
  return (
    <div
      className={`flex items-start gap-2.5 ${className}`}
      {...(l
        ? {
            role: "timer",
            "aria-label": `${l.d} days, ${l.h} hours, ${l.m} minutes until the race`,
          }
        : { "aria-hidden": true })}
    >
      <Column value={l ? pad(l.d) : "--"} unit="days" />
      <Colon />
      <Column value={l ? pad(l.h) : "--"} unit="hrs" />
      <Colon />
      <Column value={l ? pad(l.m) : "--"} unit="min" />
      <Colon />
      <Column value={l ? pad(l.s) : "--"} unit="sec" />
    </div>
  );
}
