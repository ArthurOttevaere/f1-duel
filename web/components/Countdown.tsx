"use client";

import { useEffect, useState } from "react";

function remaining(target: number) {
  const ms = Math.max(0, target - Date.now());
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, d, h, m, s };
}

export default function Countdown({ to, label }: { to: string; label: string }) {
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
      <p className="font-mono text-sm text-ink-mute" aria-hidden>
        {label} —:—:—
      </p>
    );
  }
  if (now.ms === 0) {
    return <p className="font-mono text-sm text-race">{label} closed</p>;
  }

  const parts =
    now.d > 0
      ? `${now.d}d ${now.h}h ${now.m}m`
      : `${String(now.h).padStart(2, "0")}:${String(now.m).padStart(2, "0")}:${String(now.s).padStart(2, "0")}`;

  return (
    <p className="font-mono text-sm text-ink-dim">
      {label} <span className="text-ink">{parts}</span>
    </p>
  );
}
