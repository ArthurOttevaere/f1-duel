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

/** "P4" etc. */
export function pos(n: number): string {
  return `P${n}`;
}

export function driverPhoto(driverId: string): string {
  return `/drivers/${driverId}.png`;
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
