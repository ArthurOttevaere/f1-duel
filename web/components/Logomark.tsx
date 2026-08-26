import type { CSSProperties } from "react";

/**
 * The logomark: a D whose counter is a Formula 1 seen from above, with the
 * start-finish chequer running down the stem.
 *
 * ## One colour, and a hole
 *
 * The mark is **a single fill plus a knockout.** Everything solid is
 * `currentColor`, so the caller decides the contrasting colour and the mark
 * inverts with whatever it sits on. The car and half the chequer are not
 * painted at all: a mask cuts them out of the letter, so they show **whatever
 * is actually behind the logo** — the page, a glass card, a red button, a blue
 * banner. On the site's ground the car is `#0a0b10`; drop the same markup on
 * blue and the car is blue, with nothing to configure.
 *
 * Painting them `var(--color-bg)` instead would be right only while the logo
 * sits directly on the page background, and wrong the moment it lands on a
 * card, an image or a coloured surface. A hole is right everywhere.
 *
 * The masks live in `LogoSprite`, once per document — see the note there,
 * which is a real bug and not a preference.
 *
 * ## Two cuts, and which one goes where
 *
 * `withName` draws the vertical "F1 Duel" that comes with the source file
 * beside the mark. **It is for large surfaces only.** The lettering is about a
 * ninth of the drawing's width, so at the 24px the nav gives it the name is
 * three pixels wide: not small type, but grit on the left edge that makes the
 * mark dirtier rather than richer. Measured at 300 / 96 / 48 / 26px before
 * choosing.
 *
 * So: `withName` on the boot screen, where the mark is drawn at 120px and the
 * name reads. Everywhere else the mark stands alone beside the Archivo name
 * (`Wordmark`) — which also avoids printing "F1 Duel" twice on one line, in
 * two different cuts, which is the one thing a logotype cannot do.
 *
 * **It has to be inlined, never `<img src>`.** An SVG in an `<img>` is an
 * isolated document: it cannot see the page's `color`, so the letter would
 * render black on black, and the knockout would show the img's own transparent
 * backdrop rather than the surface behind it. The standalone files the
 * platform demands — `favicon.ico`, `apple-icon.png`,
 * `public/icon-{192,512}.png` — are therefore baked against the site's dark
 * ground, which is the only place they are ever seen.
 *
 * Coordinates are rounded to one decimal: invisible, because the viewBox is
 * 764 units wide and the mark is never drawn much above 300 pixels.
 */
export default function Logomark({
  className = "",
  style,
  withName = false,
}: {
  className?: string;
  style?: CSSProperties;
  /** Draw the vertical "F1 Duel" beside the mark. Large sizes only. */
  withName?: boolean;
}) {
  // Tight to the ink in each cut, measured rather than guessed, so callers can
  // size by height and get no stray padding on either.
  const box = withName ? "326 244 946 1012" : "509 244 764 1012";
  return (
    <svg
      viewBox={box}
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      <rect
        x="0"
        y="0"
        width="1500"
        height="1500"
        fill="currentColor"
        mask={`url(#${withName ? "duel-cut-name" : "duel-cut"})`}
      />
    </svg>
  );
}
