"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_LINKS, activeHref } from "@/lib/nav";

export default function MobileNav({
  signedIn,
  username,
}: {
  signedIn: boolean;
  username: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const active = activeHref(pathname);
  const close = () => setOpen(false);

  // Portals need the DOM; only render into document.body after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag for the portal
  useEffect(() => setMounted(true), []);

  // Lock background scroll while the menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // The overlay is rendered through a portal on <body>, NOT inside the nav —
  // the nav's backdrop-filter creates a containing block that would otherwise
  // trap this position:fixed panel inside the little nav bar.
  const overlay =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col bg-bg sm:hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <Link
                href="/"
                onClick={close}
                className="font-mono text-sm font-semibold tracking-widest"
              >
                <span className="text-race">F1</span> DUEL
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="pressable flex size-10 items-center justify-center rounded-full text-3xl leading-none text-ink"
              >
                ×
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 pt-4">
              {NAV_LINKS.map((l) => {
                const isActive = active === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    className={`rounded-2xl px-5 py-4 text-lg font-medium transition-colors ${
                      isActive ? "bg-race text-white" : "glass-chip text-ink"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}

              <div className="mt-auto flex flex-col gap-2 pb-8 pt-6">
                {signedIn ? (
                  <>
                    <Link
                      href={`/profile/${username ?? ""}`}
                      onClick={close}
                      className="glass-chip rounded-2xl px-5 py-4 text-center text-lg font-medium"
                    >
                      {username ? `${username} — your profile` : "Your profile"}
                    </Link>
                    <form action="/auth/signout" method="post">
                      <button
                        type="submit"
                        onClick={close}
                        className="w-full rounded-2xl border border-line px-5 py-4 text-center text-lg font-medium text-ink-dim"
                      >
                        Sign out
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={close}
                    className="rounded-2xl bg-race px-5 py-4 text-center text-lg font-semibold text-white"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </nav>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="pressable flex size-10 items-center justify-center rounded-full"
      >
        <span className="relative block h-3 w-5">
          <span className="absolute left-0 top-0 block h-0.5 w-5 rounded bg-ink" />
          <span className="absolute left-0 top-1.5 block h-0.5 w-5 rounded bg-ink" />
          <span className="absolute left-0 top-3 block h-0.5 w-5 rounded bg-ink" />
        </span>
      </button>
      {overlay}
    </div>
  );
}
