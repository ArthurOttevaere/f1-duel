// Single source of truth for the primary navigation (desktop + mobile).

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/game", label: "The game" },
  // Leagues had their own tab and it split the same question in two — "where
  // do I stand?" answered in one place, "where do I stand among my friends?"
  // in another, with two different-looking boards. Standings now owns both:
  // the league filter also carries everything you can do to that league.
  { href: "/game/standings", label: "Standings" },
  { href: "/rules", label: "Rules" },
  { href: "/model", label: "The model" },
] as const;

/** The board, global (null) or filtered to one league. */
export function standingsHref(leagueId: number | null): string {
  return leagueId === null
    ? "/game/standings"
    : `/game/standings?league=${leagueId}`;
}

/**
 * The nav entry that best matches the current path, or null. The most specific
 * match wins, so /game/standings highlights "Standings" (not "The game") and
 * /game/picks highlights "The game".
 */
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of NAV_LINKS) {
    const match =
      href === "/"
        ? pathname === "/"
        : pathname === href || pathname.startsWith(href + "/");
    if (match && (best === null || href.length > best.length)) best = href;
  }
  return best;
}
