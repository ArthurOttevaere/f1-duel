"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, activeHref } from "@/lib/nav";
import PendingDot from "@/components/PendingDot";

// Desktop nav links with the current section highlighted.
export default function NavLinks({
  pendingHref = null,
}: {
  /** The one link carrying the "your move" dot, if any. */
  pendingHref?: string | null;
}) {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <div className="hidden items-center gap-5 text-sm md:flex">
      {NAV_LINKS.map((l) => {
        const isActive = active === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            // `display` here too: the labels sit a few pixels from the
            // wordmark, and at the same width they read as one masthead
            // rather than as a logo with a menu bolted on.
            className={`display relative transition-colors ${
              isActive
                ? "font-semibold text-ink"
                : "font-medium text-ink-dim hover:text-ink"
            }`}
          >
            {l.label}
            {/* Superscript, off the text box: the label keeps its width, so
                the nav does not shift when the dot comes or goes. */}
            {pendingHref === l.href && (
              <PendingDot
                label="— your top 10 is still to file"
                className="absolute -top-0.5 -right-2"
              />
            )}
            {isActive && (
              <span
                aria-hidden
                className="absolute -bottom-2 left-0 right-0 h-0.5 bg-race"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
