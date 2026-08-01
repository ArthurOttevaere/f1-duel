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

function Segment({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* tabular-nums so the digits keep their box as they tick — without it
          the whole row twitches once a second on proportional figures. */}
      <span className="font-mono text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
      </span>
      <span className="font-mono text-[0.55rem] tracking-[0.15em] text-ink-mute uppercase">
        {unit}
      </span>
    </div>
  );
}

/**
 * The ticking half of the hero's next-race widget.
 *
 * Deliberately unanimated: this updates once a second, forever, and anything
 * that moved on each tick would be noise rather than polish. The only motion
 * is the hero's existing entrance, which the parent owns.
 */
export default function NextRaceCountdown({ to }: { to: string }) {
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

  // Same shape and width as the real thing, so hydration swaps the digits in
  // without shifting a single pixel around them.
  if (!left) {
    return (
      <div className="flex items-start gap-4" aria-hidden>
        <Segment value="--" unit="days" />
        <Segment value="--" unit="hrs" />
        <Segment value="--" unit="min" />
        <Segment value="--" unit="sec" />
      </div>
    );
  }

  if (left.ms === 0) {
    return (
      <p className="font-mono text-sm font-semibold tracking-wider text-race uppercase">
        Lights out
      </p>
    );
  }

  return (
    <div
      className="flex items-start gap-4"
      role="timer"
      aria-label={`${left.d} days, ${left.h} hours, ${left.m} minutes until the race`}
    >
      <Segment value={pad(left.d)} unit="days" />
      <Segment value={pad(left.h)} unit="hrs" />
      <Segment value={pad(left.m)} unit="min" />
      <Segment value={pad(left.s)} unit="sec" />
    </div>
  );
}
