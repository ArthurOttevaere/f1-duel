// Single source of truth for the primary navigation (desktop + mobile).

import { CURRENT_SEASON } from "@/lib/constants";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/game", label: "The game" },
  // Leagues had their own tab and it split the same question in two — "where
  // do I stand?" answered in one place, "where do I stand among my friends?"
  // in another, with two different-looking boards. Standings now owns both:
  // the league filter also carries everything you can do to that league.
  { href: "/game/standings", label: "Standings" },
  // The real season — calendar, results, the championship — and no game in
  // it. Named after the sport and the year rather than "Season" or
  // "Championship", both of which the game already uses for its own board and
  // its own picks. One tab for the whole section: its three views are
  // `F1_TABS`, inside it.
  { href: "/f1", label: `F1 ${CURRENT_SEASON}` },
  { href: "/rules", label: "Rules" },
  { href: "/model", label: "The model" },
] as const;

/** The `/f1` section's own index (components/f1/SectionTabs.tsx). */
export const F1_TABS = [
  { href: "/f1", label: "Schedule" },
  { href: "/f1/results", label: "Results" },
  { href: "/f1/championship", label: "Championship" },
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
