export function formatRaceDate(iso: string | null): string {
  if (!iso) return "TBC";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatRaceTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * A margin against the model, always signed: "+53", "−2", "0".
 *
 * The sign is the whole point — it says which side of the machine you are on
 * — so a positive margin is never printed bare. Minus is U+2212, not a hyphen,
 * so it lines up with the digits in the tabular columns it appears in.
 */
export function formatMargin(n: number): string {
  const rounded = Number(n.toFixed(1));
  if (rounded === 0) return "0";
  return rounded > 0
    ? `+${formatPoints(rounded)}`
    : `−${formatPoints(Math.abs(rounded))}`;
}

/** "P4" etc. */
export function pos(n: number): string {
  return `P${n}`;
}

/**
 * WebP, not PNG. The portraits are photographs with an alpha channel, which
 * PNG-24 stores at around 210 kB each — the driver pool renders all twenty-two
 * at once, so the one screen where you actually play was pulling 4.6 MB. Same
 * pixels in WebP: 24 kB each, 0.5 MB for the set.
 *
 * Read by the canvas poster too (`lib/poster/draw.ts`), which is fine: every
 * browser that can run the export can decode WebP.
 */
export function driverPhoto(driverId: string): string {
  return `/drivers/${driverId}.webp`;
}

/** Last name, capitalized: "max_verstappen" -> "Verstappen". */
export function shortName(driverId: string): string {
  const parts = driverId.split("_");
  const last = parts[parts.length - 1] ?? driverId;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const MULTIPLIER_LABELS: Record<string, string> = {
  "1": "",
  "1.5": "×1.5",
  "2": "×2",
  "3": "×3",
};

export function multiplierLabel(mult: number): string {
  return MULTIPLIER_LABELS[String(mult)] ?? `×${mult}`;
}
