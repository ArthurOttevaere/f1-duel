"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { F1_TABS } from "@/lib/nav";

/**
 * The `/f1` section's own index: Schedule · Results · Championship.
 *
 * The section is one entry in the main nav on purpose — three more tabs up
 * there would crowd the bar and sit beside *Standings* asking to be confused
 * with it. So the split lives here, drawn in the instrument register (the
 * sort toggle's frame, DESIGN §7.3) rather than as a second row of nav links:
 * mono, neutral, square-cornered, and visibly subordinate to the bar above.
 *
 * A weekend page (`/f1/18`) lights none of the three — it is both a schedule
 * and a result, and claiming either would be a guess.
 */
export default function SectionTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Formula 1 season" className="flex overflow-hidden rounded-control border border-line">
      {F1_TABS.map((t) => {
        const on = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`pressable px-3 py-2 font-mono text-[0.7rem] tracking-wider uppercase transition-colors sm:px-4 ${
              on ? "bg-glass-strong text-ink" : "text-ink-mute hover:text-ink-dim"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
