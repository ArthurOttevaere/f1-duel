import Link from "next/link";

/**
 * The body of both 404s, written once.
 *
 * There are two, because the App Router resolves them from different places:
 * `app/(site)/not-found.tsx` catches a `notFound()` thrown inside the site
 * group (a username nobody owns, a round that isn't a race) and inherits the
 * group's nav and footer; `app/not-found.tsx` catches a URL that matches no
 * route at all and has to bring its own chrome.
 *
 * Both exist mainly to *replace* Next's built-in one, which ships a stylesheet
 * setting `body { background: #fff; color: #000 }`. On a site that is dark
 * everywhere else that turned an unknown profile link into a white page with a
 * white nav — the checkered footer inverted, the lot.
 *
 * No aurora here on purpose: it belongs to the hero and only to the hero
 * (ALMANAC §9.6). Space and type do the work, as everywhere else.
 */
export default function NotFoundBody() {
  return (
    <main className="mx-auto flex w-[min(64rem,calc(100%-2rem))] flex-1 flex-col justify-center py-28">
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
        Error 404
      </p>
      <h1 className="display mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
        You&apos;ve run wide.
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-ink-dim">
        There&apos;s nothing at this address. It may have moved, or the link may
        have lost a character on its way to you.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/game"
          className="pressable btn-race px-6 py-3 text-sm font-semibold"
        >
          Back to the duel
        </Link>
        <Link
          href="/game/standings"
          className="pressable glass-chip rounded-full px-6 py-3 text-sm font-semibold transition-colors hover:border-line-hi"
        >
          Standings
        </Link>
        <Link
          href="/"
          className="pressable glass-chip rounded-full px-6 py-3 text-sm font-semibold transition-colors hover:border-line-hi"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
