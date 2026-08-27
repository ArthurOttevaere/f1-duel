"use client";

import { useEffect, useState } from "react";

export interface RulesSection {
  id: string;
  label: string;
}

/**
 * The page's spine.
 *
 * `/rules` is the longest read on the site and its table of contents was eight
 * `glass-chip rounded-full` pills wrapping under the title — a heap that says
 * neither "this is an index", nor how many sections there are, nor where you
 * are in them. It is a numbered list now: a sticky rail from `lg` up with the
 * current section lit as you scroll, and above `lg` nothing else changes about
 * the page.
 *
 * Three decisions:
 *
 * - **The numerals are the same ones the section heads carry**, so the rail is
 *   an index and not a second navigation. `01` on the left is `01` on the
 *   right.
 * - **`IntersectionObserver`, not a scroll handler.** The band is
 *   `-30% / -55%`: a section counts as current once its heading has reached
 *   the upper third, which is where a reader's eye is, rather than when it
 *   crosses the very top of the viewport under a fixed nav.
 * - **On a phone it is a plain list, not a rail** — sticky anything on a
 *   380px-wide screen spends the width the reading needs (§1.5). It sits once,
 *   under the lead, and scrolls away like the index of a book.
 */
export default function RulesIndex({
  sections,
  className = "",
}: {
  sections: readonly RulesSection[];
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section currently inside the band wins; entries arrive
        // in no useful order, so the visible ones are re-sorted by position.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sections" className={className}>
      {/* Not "The manual" — that is the page's own eyebrow four lines above,
          and a heading repeated twice in one screen reads as a mistake. */}
      <p className="font-mono text-[0.65rem] tracking-[0.18em] text-ink-mute uppercase">
        Contents
      </p>
      <ol className="mt-4 flex flex-col">
        {sections.map((s, i) => {
          const on = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={on ? "true" : undefined}
                className={`group flex items-baseline gap-3 py-1.5 text-sm transition-colors ${
                  on ? "text-ink" : "text-ink-dim hover:text-ink"
                }`}
              >
                <span
                  aria-hidden
                  className={`font-mono text-xs font-semibold tabular-nums transition-colors ${
                    on ? "text-race" : "text-ink-mute"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {s.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
