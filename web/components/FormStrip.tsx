import Link from "next/link";
import { formatPoints } from "@/lib/format";

export interface FormEntry {
  round: number;
  race: string;
  outcome: "W" | "D" | "L";
  points: number;
}

/**
 * The last five duels, oldest on the left — the football table convention,
 * because it is the one everybody already reads without a legend.
 *
 * Each pill is a link to that race's review, and carries the race name and
 * score in its tooltip so the strip answers "what happened there?" without
 * spending a row on it.
 */
export default function FormStrip({ entries }: { entries: FormEntry[] }) {
  if (entries.length === 0) return null;

  const style = {
    W: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    D: "border-amber-300/40 bg-amber-300/10 text-amber-200",
    L: "border-race/40 bg-race/10 text-race",
  };

  return (
    <div className="flex items-center gap-2">
      {entries.map((e) => (
        <Link
          key={e.round}
          href={`/game/races/${e.round}`}
          title={`R${e.round} ${e.race} — ${formatPoints(e.points)} pts`}
          className={`pressable flex h-9 w-9 items-center justify-center rounded-control border font-mono text-sm font-bold transition-colors hover:border-line-hi ${style[e.outcome]}`}
        >
          {e.outcome}
        </Link>
      ))}
      <span className="ml-1 text-xs text-ink-mute">latest</span>
    </div>
  );
}
