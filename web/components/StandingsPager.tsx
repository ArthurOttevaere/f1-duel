import Link from "next/link";

/**
 * A square control, and the whole of the site's pagination furniture.
 *
 * The default component — "← Previous · Page 2 of 5 · Next →" — is the one
 * everybody writes without thinking, arrows glued to their labels included
 * (§7.9). What a reader of a leaderboard wants to know is *which places they
 * are looking at*, so the band says `21–40 of 96` and the two controls are
 * icon-only: a chevron is not a word and does not need one beside it.
 */
function PageStep({
  page,
  leagueId,
  disabled,
  label,
  direction,
}: {
  page: number;
  leagueId: number | null;
  disabled: boolean;
  label: string;
  direction: "prev" | "next";
}) {
  const chevron = (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path
        d={direction === "prev" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (disabled) {
    return (
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-control border border-line text-ink-mute opacity-40"
      >
        {chevron}
      </span>
    );
  }

  const params = new URLSearchParams();
  if (leagueId !== null) params.set("league", String(leagueId));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  return (
    <Link
      href={`/game/standings${query ? `?${query}` : ""}`}
      aria-label={label}
      className="pressable flex size-9 items-center justify-center rounded-control border border-line-hi text-ink-dim transition-colors hover:bg-glass-strong hover:text-ink"
    >
      {chevron}
    </Link>
  );
}

/** Which places you are looking at, and the two ways out of them. */
export default function StandingsPager({
  page,
  totalPages,
  totalPlayers,
  leagueId,
  perPage,
}: {
  page: number;
  totalPages: number;
  totalPlayers: number;
  leagueId: number | null;
  perPage: number;
}) {
  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, totalPlayers);

  return (
    <nav className="flex items-center justify-between gap-4">
      <p className="font-mono text-xs text-ink-mute tabular-nums">
        <span className="text-ink-dim">
          {first}–{last}
        </span>{" "}
        of {totalPlayers} {totalPlayers === 1 ? "player" : "players"}
      </p>
      <div className="flex gap-2">
        <PageStep
          page={page - 1}
          leagueId={leagueId}
          disabled={page === 1}
          label="Previous page"
          direction="prev"
        />
        <PageStep
          page={page + 1}
          leagueId={leagueId}
          disabled={page === totalPages}
          label="Next page"
          direction="next"
        />
      </div>
    </nav>
  );
}

