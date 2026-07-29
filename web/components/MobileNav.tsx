"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/game", label: "The game" },
  { href: "/game/standings", label: "Standings" },
  { href: "/rules", label: "Rules" },
  { href: "/model", label: "The model" },
];

export default function MobileNav({
  signedIn,
  username,
}: {
  signedIn: boolean;
  username: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="pressable flex size-9 items-center justify-center rounded-full"
      >
        <span className="relative block h-3 w-5">
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded bg-ink transition-transform duration-200 ${
              open ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded bg-ink transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded bg-ink transition-transform duration-200 ${
              open ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 top-0 z-40 bg-bg/80 backdrop-blur-sm">
          <nav className="mt-24 flex flex-col gap-1 px-6">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="glass-chip rounded-2xl px-5 py-4 text-lg font-medium"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={signedIn ? `/profile/${username ?? ""}` : "/login"}
              onClick={close}
              className="mt-2 rounded-2xl bg-race px-5 py-4 text-center text-lg font-semibold text-white"
            >
              {signedIn
                ? username
                  ? `${username} — your profile`
                  : "Your profile"
                : "Sign in"}
            </Link>
            {signedIn && (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  onClick={close}
                  className="glass-chip mt-1 w-full rounded-2xl px-5 py-4 text-center text-lg font-medium text-ink-dim"
                >
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
