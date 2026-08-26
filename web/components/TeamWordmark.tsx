import { teamColor } from "@/lib/teams";

/**
 * A constructor, drawn as a pit-lane name plate: the name in spaced capitals
 * over a bar of its colour.
 *
 * There are no team logos in this repository and there is no plan to add any —
 * they are trademarks, and the grid changes. A wordmark costs nothing, works
 * for a team that joins next season, and takes the colour the roster already
 * knows (`lib/teams.ts`).
 */
export default function TeamWordmark({
  team,
  color,
  size = "md",
}: {
  team: string;
  /** Pre-resolved colour. Falls back to looking the team up on its own. */
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const paint = color ?? teamColor(team);
  const type = {
    sm: "text-[0.7rem] tracking-[0.18em]",
    md: "text-sm tracking-[0.2em]",
    lg: "text-lg sm:text-xl tracking-[0.22em]",
  }[size];
  const bar = { sm: "h-[2px]", md: "h-[3px]", lg: "h-1" }[size];

  return (
    <span className="inline-flex flex-col gap-1.5">
      <span className={`font-semibold uppercase ${type}`}>{team}</span>
      <span
        aria-hidden
        className={`${bar} w-full`}
        style={{ background: `linear-gradient(90deg, ${paint}, transparent)` }}
      />
    </span>
  );
}
