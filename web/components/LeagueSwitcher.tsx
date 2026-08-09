"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { standingsHref } from "@/lib/nav";
import LeagueActions from "./LeagueActions";

export interface SwitcherLeague {
  id: number;
  name: string;
}

/**
 * The one control that used to be two tabs: pick Global or a league, and get
 * that league's board *and* everything you can do to it in the same place.
 *
 * Switching costs a server round-trip (the board is ranked in SQL against a
 * table only the server can read), and a plain <Link> spends it showing the
 * previous league — the site looked frozen for a second or two. Pushing inside
 * a transition gives us `pending` for exactly that window, so the board dims
 * behind a spinner instead.
 */
export default function LeagueSwitcher({
  leagues,
  selectedId,
  children,
}: {
  leagues: SwitcherLeague[];
  selectedId: number | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<number | null>(null);

  function go(e: React.MouseEvent<HTMLAnchorElement>, id: number | null) {
    // Modified clicks belong to the browser: new tab, new window, download.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (id === selectedId) return;
    setTarget(id);
    startTransition(() => router.push(standingsHref(id), { scroll: false }));
  }

  function pill(id: number | null, label: string) {
    const active = selectedId === id;
    const loading = pending && target === id;
    return (
      <Link
        key={id ?? "global"}
        href={standingsHref(id)}
        onClick={(e) => go(e, id)}
        aria-current={active ? "page" : undefined}
        // The pill only pulses while it loads. A spinner inside it would
        // resize the pill and shove the rest of the row sideways; the spinner
        // that matters is the one over the board.
        className={`pressable max-w-[14rem] truncate rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          active
            ? "bg-race text-white"
            : "glass-chip text-ink-dim hover:text-ink"
        } ${loading ? "animate-pulse" : ""}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {pill(null, "Global")}
        {leagues.map((l) => pill(l.id, l.name))}
        <LeagueActions hasLeagues={leagues.length > 0} />
      </div>

      <div>
        <div
          aria-busy={pending}
          className={`flex flex-col gap-8 transition-opacity duration-200 ${
            pending ? "pointer-events-none opacity-25" : ""
          }`}
        >
          {children}
        </div>

        {/* Fixed, not absolute: the board can be one screen or ten, and a
            spinner pinned to the top of it is off-screen for anyone who
            switched leagues from halfway down. Centred in the viewport it is
            always where you are looking, and it clears the fixed nav. */}
        {pending && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
          >
            <span className="size-11 animate-spin rounded-full border-2 border-line border-t-race" />
            <span className="sr-only">Loading the board…</span>
          </div>
        )}
      </div>
    </div>
  );
}
