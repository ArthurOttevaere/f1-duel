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
          <div className="menu-in fixed inset-0 z-[100] flex flex-col bg-bg sm:hidden">
            <div className="flex items-center justify-between px-6 py-5">
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
                className="pressable -mr-2 flex size-10 items-center justify-center rounded-full text-3xl leading-none text-ink-dim transition-colors active:text-race"
              >
                ×
              </button>
            </div>

            <nav className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
              {NAV_LINKS.map((l, i) => {
                const isActive = active === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={close}
                    aria-current={isActive ? "page" : undefined}
                    style={{ animationDelay: `${50 + i * 45}ms` }}
                    className={`menu-item pressable text-3xl font-semibold tracking-tight transition-colors ${
                      isActive ? "text-race" : "text-ink-dim active:text-race"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col items-center gap-4 pb-14 text-center">
              {signedIn ? (
                <>
                  <Link
                    href={`/profile/${username ?? ""}`}
                    onClick={close}
                    className="pressable text-sm text-ink-dim transition-colors active:text-race"
                  >
                    {username ? `@${username}` : "Your profile"}
                  </Link>
                  <form action="/auth/signout" method="post">
                    <button
                      type="submit"
                      onClick={close}
                      className="pressable text-sm text-ink-mute transition-colors active:text-race"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={close}
                  className="pressable text-lg font-semibold text-race"
                >
                  Sign in
                </Link>
              )}
            </div>
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
