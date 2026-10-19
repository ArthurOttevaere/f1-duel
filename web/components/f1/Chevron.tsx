/**
 * The "this row goes somewhere" mark of an index list — the same chevron
 * `SeasonRaces` draws (DESIGN §7.5), lifted with its row's `group` hover.
 */
export default function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3 text-ink-mute/60 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:text-ink-dim"
    >
      <path
        d="M6 3l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
