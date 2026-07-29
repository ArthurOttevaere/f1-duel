import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import MobileNav from "@/components/MobileNav";

export default async function SiteNav() {
  const user = await getUser();

  let username: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = data?.username ?? null;
  }

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

        <div className="hidden items-center gap-6 text-sm text-ink-dim sm:flex">
          <Link href="/game" className="transition-colors hover:text-ink">
            The game
          </Link>
          <Link
            href="/game/standings"
            className="transition-colors hover:text-ink"
          >
            Standings
          </Link>
          <Link href="/rules" className="transition-colors hover:text-ink">
            Rules
          </Link>
          <Link href="/model" className="transition-colors hover:text-ink">
            The model
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {username ? (
            <Link
              href={`/profile/${username}`}
              className="pressable glass-chip rounded-full px-4 py-1.5 text-sm font-medium hover:border-line-hi"
            >
              {username}
            </Link>
          ) : (
            <Link
              href="/login"
              className="pressable hidden rounded-full bg-race px-4 py-1.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgb(255_30_60/0.35)] hover:bg-race-deep sm:inline-block"
            >
              Sign in
            </Link>
          )}
          <MobileNav username={username} />
        </div>
      </nav>
    </header>
  );
}
