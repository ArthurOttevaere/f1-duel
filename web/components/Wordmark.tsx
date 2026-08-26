import Logomark from "@/components/Logomark";

/**
 * The site's name, in one place.
 *
 * It was set four times — nav, mobile menu, footer, boot screen — in Geist
 * Mono, which is the charte's voice for *data*. A name is not data. It is
 * Archivo at wdth 118 now, the same width as every headline on the site, so
 * the page signs itself in the face it speaks in; the mono stays where it
 * belongs, on numbers.
 *
 * Wide letter-spacing rather than a wide space between the words: at 14px the
 * expanded cut needs air to read as lettering instead of as a bold word.
 *
 * ## The mark
 *
 * Since the logomark exists, this is a lockup rather than a wordmark, and the
 * two halves are deliberately from different hands: the mark is the drawn D
 * with the car in it, the name is Archivo. The alternative — using the
 * vertical "F1 Duel" lettering baked into the logo file — would put two
 * different cuts of the same two words on the same line.
 *
 * The mark is sized in `em`, so it tracks whatever type size the caller sets
 * and the lockup never needs a second measurement. `gap-[0.5em]` for the same
 * reason.
 *
 * `mark={false}` exists for any surface that already carries the mark at size
 * and would stutter by repeating it. Nothing uses it yet; all eight call sites
 * take the lockup whole.
 */
export default function Wordmark({
  className = "",
  mark = true,
}: {
  className?: string;
  /** Draw the logomark before the name. */
  mark?: boolean;
}) {
  return (
    // `text-sm` lives out here, not on the lettering, so the mark's `em`
    // sizing resolves against a size this component controls rather than
    // against whatever it happens to be nested in.
    <span
      className={`inline-flex items-center gap-[0.5em] text-sm ${className}`}
    >
      {mark && <Logomark className="h-[1.7em] w-auto shrink-0" />}
      <span className="display font-extrabold tracking-[0.2em] uppercase">
        <span className="text-race">F1</span> Duel
      </span>
    </span>
  );
}
