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
 * painted at all: they are cut out of the letter by a mask, so they show
 * **whatever is actually behind the logo** — the page, a glass card, a red
 * button, a blue banner. On the site's own ground the car is `#0a0b10`; drop
 * the same markup on blue and the car is blue, with nothing to configure.
 *
 * The alternative was painting them with `var(--color-bg)`. That is right only
 * while the logo sits directly on the page background, and wrong the moment it
 * lands on a card, an image or a coloured surface. A hole is right everywhere.
 *
 * The mask itself lives in `LogoSprite`, once per document — see the note
 * there, which is a real bug and not a preference.
 *
 * **It has to be inlined, never `<img src>`.** An SVG in an `<img>` is an
 * isolated document: it cannot see the page's `color`, so the letter would
 * render black on black, and the knockout would show the img's own transparent
 * backdrop rather than the surface behind it. The standalone files the
 * platform demands — `favicon.ico`, `apple-icon.png`,
 * `public/icon-{192,512}.png` — are therefore baked against the site's dark
 * ground, which is the only place they are ever seen.
 *
 * The vertical "F1 Duel" lettering and the "Race Prediction Game" line that
 * come with the source file are not here. The site sets its name in Archivo
 * (`Wordmark`), and two different cuts of the same two words on one line is
 * the one thing a logotype cannot do. The full lockup is kept at
 * `public/logo-lockup.svg`.
 */
export default function Logomark({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="478 349 751 778"
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      <rect
        x="478"
        y="349"
        width="751"
        height="778"
        fill="currentColor"
        mask="url(#duel-cut)"
      />
    </svg>
  );
}
