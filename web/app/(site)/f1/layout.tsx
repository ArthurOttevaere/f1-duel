import SectionTabs from "@/components/f1/SectionTabs";
import { CURRENT_SEASON } from "@/lib/constants";

/**
 * The real season: calendar, results, the championship.
 *
 * A section of its own rather than a corner of `/game`, and deliberately
 * outside the game's layout: no onboarding gate, no session needed, and
 * nothing on it reads a score. Every number under `/f1` is the sport's own —
 * Jolpica and OpenF1, through `lib/f1/` — so it can never be mistaken for the
 * game's board, which is the point of keeping it apart.
 *
 * The red eyebrow opens every page of the section (DESIGN §4.4); the views
 * carry their own h1 under it.
 */
export default function F1Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
            Formula 1 · {CURRENT_SEASON}
          </p>
          <p className="mt-1.5 text-xs text-ink-mute">
            The real season, for reference. Nothing here scores in F1 Duel.
          </p>
        </div>
        <SectionTabs />
      </div>
      {children}
    </main>
  );
}
