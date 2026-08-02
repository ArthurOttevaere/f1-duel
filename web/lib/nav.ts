// Single source of truth for the primary navigation (desktop + mobile).

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/game", label: "The game" },
  { href: "/game/standings", label: "Standings" },
  // Leagues used to be reachable from the footer alone, which is to say not
  // reachable: players signed up, never found them, and concluded the feature
  // was not for them.
  { href: "/game/leagues", label: "Leagues" },
  { href: "/rules", label: "Rules" },
  { href: "/model", label: "The model" },
] as const;

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
