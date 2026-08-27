import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/auth";
import MobileNav from "@/components/MobileNav";
import NavLinks from "@/components/NavLinks";
import Wordmark from "@/components/Wordmark";

export default async function SiteNav() {
  const user = await getUser();
  // Request-cached: the game layout guard reads the same row.
  const username = (await getOwnProfile())?.username ?? null;

  return (
    <header className="fixed inset-x-0 top-0 z-[var(--z-nav)]">
      <nav className="glass-chip mx-auto mt-4 flex w-[min(64rem,calc(100%-2rem))] items-center justify-between rounded-panel px-5 py-3 shadow-[0_8px_26px_rgb(0_0_0/0.32)]">
        <Link
          href="/"
          className="pressable flex items-center"
        >
          <Wordmark />
        </Link>

        <NavLinks />

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* The pill said a name and nothing else, which reads as a
                  label rather than as the way back to your own page. The
                  figure in front of it says whose page. It is the house
                  icon idiom — inline, 1.5 stroke, currentColor — so the
                  whole chip, glyph and name together, goes red on hover
                  the way every other destination on the site does. */}
              <Link
                href={`/profile/${username ?? ""}`}
                className="pressable glass-chip hidden items-center gap-2 rounded-control px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-line-hi hover:text-race md:flex"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="3.25" />
                  <path d="M5 19.5a7 7 0 0 1 14 0" />
                </svg>
                {username ?? "Profile"}
              </Link>
              <form action="/auth/signout" method="post" className="hidden md:block">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="pressable glass-chip rounded-control px-3 py-1.5 text-sm text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="pressable hidden btn-race px-4 py-1.5 text-sm font-semibold md:inline-block"
            >
              Sign in
            </Link>
          )}
          <MobileNav signedIn={Boolean(user)} username={username} />
        </div>
      </nav>
    </header>
  );
}
