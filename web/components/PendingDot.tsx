/**
 * "Something here is waiting on you." One red dot, no number: at most two
 * things can be owed (a race entry, the championship call), and a count would
 * turn a nudge into an inbox. Race red because on this site red already means
 * "your move". The words are for screen readers only — the dot is decoration
 * for everyone else, and the link it sits on still says where it goes.
 *
 * `ring` punches the dot out of whatever it overlaps (the hamburger, a chip
 * edge) in the page colour, so it reads as a badge rather than a stain.
 */
export default function PendingDot({
  label,
  className = "",
  ring = false,
  large = false,
}: {
  label: string;
  className?: string;
  ring?: boolean;
  /** 8px instead of 6px — next to display-size type, or punched out. */
  large?: boolean;
}) {
  return (
    <>
      <span
        aria-hidden
        className={`block shrink-0 rounded-full bg-race ${
          large || ring ? "size-2" : "size-1.5"
        } ${ring ? "ring-2 ring-bg" : ""} ${className}`}
      />
      <span className="sr-only">{label}</span>
    </>
  );
}
