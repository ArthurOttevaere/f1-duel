/**
 * The one arrow on the site.
 *
 * Six links used to end their label with a literal `→` — "See the full race →",
 * "Make your picks →". A glyph glued to the end of a sentence is a writing tic:
 * it adds nothing (the link is already a link) and it sits on the text baseline,
 * so it cannot move. This is the same mark as an element, which means it can:
 * put `group` on the link and it slides on hover.
 *
 * `↗` is a different sign and it stays as a glyph — it means *leaving the site*,
 * and it is spelled out that way in §9 of the design doc. Pagination keeps its
 * "← Previous" / "Next →" too: there the arrow is the direction, not decoration.
 */
export default function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className={`size-4 shrink-0 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 ${className}`}
    >
      <path
        d="M3 8h9m0 0-3.4-3.4M12 8l-3.4 3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
