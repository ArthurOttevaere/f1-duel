"use client";

import { useEffect, useState } from "react";
import StartLights from "@/components/StartLights";

// Original, tongue-in-cheek F1 loading lines. Kept generic (no real names) so
// they stay funny and never date.
const PHRASES = [
  "Warming up the tyres…",
  "Waiting for the FIA to change its mind…",
  "Blaming the pit wall…",
  "Deleting a lap for track limits…",
  "Arguing on team radio…",
  "Bolting on a fresh set of softs…",
  "Undercutting the loading bar…",
  "Checking if it's raining in Spa…",
  "Telling the driver to hold position…",
  "Investigating an incident after the session…",
  "Simulating 10,000 Grands Prix…",
  "Serving a 5-second penalty…",
  "Charging up the DRS…",
  "Box, box, box…",
  "Lights out and away we go…",
];

// Advances across mounts so a fresh page load doesn't always open on the same
// line — module scope survives client-side navigations for the session.
let cursor = 0;

export default function RaceLoader() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const start = cursor % PHRASES.length;
    cursor = start + 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only start index
    setI(start);
    const id = setInterval(
      () => setI((v) => (v + 1) % PHRASES.length),
      1800,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex min-h-[55vh] flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
    >
      <StartLights />
      <p key={i} className="loader-phrase text-sm text-ink-dim">
        {PHRASES[i]}
      </p>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
