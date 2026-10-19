/**
 * The section's one failure state: the timing data did not answer.
 *
 * An empty-state box (DESIGN §7.8) with the one sentence that matters — it
 * is upstream, and it is temporary. A failed read is never cached
 * (`lib/f1/fetch.ts`), so the next view tries again.
 */
export default function Unreachable({ what = "the season's data" }: { what?: string }) {
  return (
    <p className="mt-10 rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute">
      {`Couldn't reach ${what} just now. It comes from Jolpica and OpenF1 — try again in a minute.`}
    </p>
  );
}
