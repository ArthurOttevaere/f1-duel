/**
 * The site's palette, for everything that cannot read a stylesheet.
 *
 * `globals.css` is where these colours live for the site itself (`@theme`,
 * DESIGN §3.1) — but two surfaces draw outside the DOM and so outside the
 * cascade: the race poster, which is painted on a `<canvas>`
 * (`lib/poster/draw.ts`), and the Open Graph cards, which are rendered through
 * Satori (`lib/og.tsx`) with no stylesheet at all. Both used to carry their own
 * hand-copied copy of the hexes, so a palette decision left them behind —
 * something DESIGN already recorded as a debt to be paid by hand.
 *
 * One module now. The debt is down to a single link: **a colour changed in
 * `globals.css` @theme has to be changed here too**, and nowhere else. The two
 * files sit beside each other in §16 of DESIGN for that reason.
 */
export const PALETTE = {
  /** The page, and the poster's bottom. */
  bg: "#0a0b10",
  /** The poster's top — the page ground lifted, so the sheet has a sky. */
  bgTop: "#101320",
  ink: "#f4f6fa",
  dim: "#a7adba",
  mute: "#6c7280",
  race: "#ff1e3c",
  raceDeep: "#c8102e",
  /** Semantic tones (§3.2): exact hit / one place off. */
  exact: "#34d399",
  near: "#fbbf24",
  /** The three translucent layers, as canvas can't use `color-mix`. */
  line: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.045)",
  row: "rgba(255,255,255,0.035)",
} as const;

export type Palette = typeof PALETTE;
