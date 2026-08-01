import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="relative mt-24">
      <div className="checker-edge" />
      <div className="mx-auto flex w-[min(64rem,calc(100%-2rem))] flex-col gap-8 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold tracking-widest">
            <span className="text-race">F1</span> DUEL
          </p>
          <p className="mt-2 max-w-xs text-sm text-ink-mute">
            One duel per Grand Prix, all season long. Humans versus the
            machine.
          </p>
        </div>

        <div className="flex gap-16 text-sm">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-ink-dim">Play</p>
            <Link href="/game" className="text-ink-mute transition-colors hover:text-ink">
              This weekend
            </Link>
            <Link href="/game/standings" className="text-ink-mute transition-colors hover:text-ink">
              Standings
            </Link>
            <Link href="/game/leagues" className="text-ink-mute transition-colors hover:text-ink">
              Leagues
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-ink-dim">More</p>
            <Link href="/rules" className="text-ink-mute transition-colors hover:text-ink">
              Rules
            </Link>
            <Link href="/model" className="text-ink-mute transition-colors hover:text-ink">
              The model
            </Link>
            <Link href="/privacy" className="text-ink-mute transition-colors hover:text-ink">
              Privacy
            </Link>
            <a
              href="https://github.com/ArthurOttevaere/f1_race_predictor"
              target="_blank"
              rel="noreferrer"
              className="text-ink-mute transition-colors hover:text-ink"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </div>
      <p className="mx-auto w-[min(64rem,calc(100%-2rem))] border-t border-line pb-8 pt-6 text-xs text-ink-mute">
        An unofficial fan project — not associated with Formula 1 or the FIA.
        Data via FastF1 &amp; Jolpica.
      </p>
    </footer>
  );
}
