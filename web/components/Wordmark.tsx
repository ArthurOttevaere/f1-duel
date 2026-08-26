/**
 * The site's name, in one place.
 *
 * It was drawn four times — nav, mobile menu, footer, boot screen — in Geist
 * Mono, which is the charte's voice for *data*. A name is not data. It is
 * Archivo at wdth 118 now, the same width as every headline on the site, so
 * the page signs itself in the face it speaks in; the mono stays where it
 * belongs, on numbers.
 *
 * Wide letter-spacing rather than a wide space between the words: at 14px the
 * expanded cut needs air to read as lettering instead of as a bold word.
 */
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`display text-sm font-extrabold tracking-[0.2em] uppercase ${className}`}
    >
      <span className="text-race">F1</span> Duel
    </span>
  );
}
