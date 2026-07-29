"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, activeHref } from "@/lib/nav";

// Desktop nav links with the current section highlighted.
export default function NavLinks() {
  const pathname = usePathname();
  const active = activeHref(pathname);

  return (
    <div className="hidden items-center gap-6 text-sm sm:flex">
      {NAV_LINKS.map((l) => {
        const isActive = active === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive ? "page" : undefined}
            className={`relative transition-colors ${
              isActive
                ? "font-medium text-ink"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {l.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-race"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
