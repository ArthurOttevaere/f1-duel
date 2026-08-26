import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import SiteFooter from "@/components/SiteFooter";
import NotFoundBody from "@/components/NotFoundBody";

/**
 * A URL that matches no route at all. This sits outside the `(site)` group, so
 * it has to bring its own shell.
 *
 * It deliberately does **not** render `SiteNav`. The root `not-found` is part
 * of the render tree of every route that resolves above the group — `/login`
 * among them — and `SiteNav` reads the session, so pulling it in here turned
 * `/login` from a static page into a dynamic one. An address that matches
 * nothing does not need a session-aware nav; it needs to look like this site
 * and offer a way back. The wordmark does both.
 */
export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="fixed inset-x-0 top-0 z-50">
        <nav className="glass-chip mx-auto mt-4 flex w-[min(64rem,calc(100%-2rem))] items-center rounded-2xl px-5 py-3 shadow-[0_8px_26px_rgb(0_0_0/0.32)]">
          <Link
            href="/"
            className="pressable flex items-baseline"
          >
            <Wordmark />
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col">
        <NotFoundBody />
      </div>

      <SiteFooter />
    </div>
  );
}
