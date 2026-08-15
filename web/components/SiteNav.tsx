import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { getOwnProfile } from "@/lib/auth";
import MobileNav from "@/components/MobileNav";
import NavLinks from "@/components/NavLinks";

export default async function SiteNav() {
  const user = await getUser();
  // Request-cached: the game layout guard reads the same row.
  const username = (await getOwnProfile())?.username ?? null;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="glass-chip mx-auto mt-4 flex w-[min(64rem,calc(100%-2rem))] items-center justify-between rounded-2xl px-5 py-3 shadow-[0_8px_26px_rgb(0_0_0/0.32)]">
        <Link
          href="/"
          className="pressable flex items-baseline gap-2 font-mono text-sm font-semibold tracking-widest"
        >
          <span className="text-race">F1</span>
          <span>DUEL</span>
        </Link>

        <NavLinks />

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href={`/profile/${username ?? ""}`}
                className="pressable glass-chip hidden rounded-full px-4 py-1.5 text-sm font-medium hover:border-line-hi md:block"
              >
                {username ?? "Profile"}
              </Link>
              <form action="/auth/signout" method="post" className="hidden md:block">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="pressable glass-chip rounded-full px-3 py-1.5 text-sm text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="pressable hidden rounded-full bg-race px-4 py-1.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgb(255_30_60/0.35)] hover:bg-race-deep md:inline-block"
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
