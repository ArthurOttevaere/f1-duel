/**
 * The chequered flag, as a mark.
 *
 * Two places used to carry a 🏁 — the poster button and the "race locked"
 * line — and they were the last colour emojis on the site: drawn by the
 * operating system, so a different flag on every phone, and the one mark on
 * the page that did not take the text colour. This is the footer's finish
 * line (`.checker-edge`) at glyph size: two rows of four, which is the floor
 * for a chequerboard to read as one (see `.checker-rule`).
 */
export default function CheckerGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 8"
      className={`h-2 w-4 shrink-0 ${className}`}
      fill="currentColor"
    >
      <path d="M0 0h4v4H0zM8 0h4v4H8zM4 4h4v4H4zM12 4h4v4h-4z" />
      <path
        d="M4 0h4v4H4zM12 0h4v4h-4zM0 4h4v4H0zM8 4h4v4H8z"
        opacity="0.18"
      />
    </svg>
  );
}
