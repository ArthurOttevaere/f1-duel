"use client";

import { useEffect, useState } from "react";
import StartLights from "@/components/StartLights";

function remaining(target: number) {
  const ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, d, h, m, s };
}

/**
 * The last hour, in five lights.
 *
 * Twelve minutes a light: the gantry is dark at an hour out, takes its fifth
 * light with twelve minutes left, and holds all five until the lock — which is
 * the blackout, exactly as it is on a real grid.
 */
const LIGHTS_WINDOW = 3_600_000;
const PER_LIGHT = LIGHTS_WINDOW / 5;
const litFor = (ms: number) =>
  Math.max(0, Math.min(5, 5 - Math.floor(ms / PER_LIGHT)));

/**
 * The clock on the game surfaces — how long until predictions lock.
 *
 * It was mono digits and nothing else: correct, and the same countdown every
 * launch page has. This is the most loaded moment on the site, so under the
 * final hour it lights the start gantry (`StartLights`, until now only used by
 * the loading screens) one light at a time. The asset was already written; it
 * is simply back where it means something.
 *
 * **The digits never leave.** The lights are `aria-hidden` decoration and a
 * five-step scale besides — nobody plans a pick around "three lights" — so the
 * exact time stays printed beside them (§1.2).
 */
export default function Countdown({
  to,
  label,
  className = "",
}: {
  to: string;
  label: string;
  className?: string;
}) {
  const target = new Date(to).getTime();
  // Render a stable placeholder on the server to avoid hydration mismatch.
  const [now, setNow] = useState<ReturnType<typeof remaining> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only first tick
    setNow(remaining(target));
    const id = setInterval(() => setNow(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!now) {
    return (
      <p className={`font-mono text-sm text-ink-mute ${className}`} aria-hidden>
        {label} —:—:—
      </p>
    );
  }

  // Lights out. Every bulb drops at once and the line turns red: on a grid
  // that is the start, here it is the door closing.
  if (now.ms === 0) {
    return (
      <div className={`flex flex-col items-start gap-2 sm:items-end ${className}`}>
        <StartLights lit={0} className="[--sl-bulb:0.5rem]" />
        <p className="font-mono text-sm text-race">{label} closed</p>
      </div>
    );
  }

  const parts =
    now.d > 0
      ? `${now.d}d ${now.h}h ${now.m}m`
      : `${String(now.h).padStart(2, "0")}:${String(now.m).padStart(2, "0")}:${String(now.s).padStart(2, "0")}`;

  const line = (
    <p className="font-mono text-sm text-ink-dim tabular-nums">
      {label} <span className="text-ink">{parts}</span>
    </p>
  );

  if (now.ms > LIGHTS_WINDOW) {
    return <div className={className}>{line}</div>;
  }

  return (
    <div className={`flex flex-col items-start gap-2 sm:items-end ${className}`}>
      <StartLights lit={litFor(now.ms)} className="[--sl-bulb:0.5rem]" />
      {line}
    </div>
  );
}
