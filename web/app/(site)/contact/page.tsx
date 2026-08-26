import Link from "next/link";
import {
  AUTHOR,
  AUTHOR_URL,
  CONTACT_EMAIL,
  CURRENT_SEASON,
  REPO_URL,
} from "@/lib/constants";

export const metadata = {
  title: "Contact & FAQ",
  description:
    "Answers to the questions F1 Duel players ask most, how to report a bug or suggest a feature, and who built the thing.",
};

/**
 * The "who do I tell?" page.
 *
 * Native `<details>` for the FAQ rather than a JavaScript accordion: it opens
 * before hydration, it is searchable by the browser's own find-in-page, and it
 * costs nothing. The contact routes are deliberately two — an issue tracker for
 * people who have a GitHub account, and an address for everyone else.
 */
function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-line py-4 first:border-t-0">
      {/* Red on hover and red while open: the question is the control, so it
          carries the same state colour the nav and the tabs do. The `+` was
          already turning; it now turns *and* lights, so open and closed are
          two channels apart, not one (§1.2). */}
      <summary className="group/q flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium transition-colors group-open:text-race hover:text-race">
        {q}
        {/* The `+` follows the summary's own hover, not the <details> group —
            the group's box grows to include the answer once it is open, and
            the marker lighting up while you read the answer is a hover state
            pointing at nothing. */}
        <span
          aria-hidden
          className="shrink-0 font-mono text-ink-mute transition-[transform,color] group-open:rotate-45 group-open:text-race group-hover/q:text-race"
        >
          +
        </span>
      </summary>
      <div className="mt-3 max-w-prose space-y-3 text-sm leading-relaxed text-ink-dim">
        {children}
      </div>
    </details>
  );
}

export default function ContactPage() {
  return (
    <main className="mx-auto w-[min(48rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
        Contact
      </p>
      <h1 className="display mt-3 text-4xl font-extrabold tracking-tight">
        Found a bug? Got an idea?
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-dim">
        F1 Duel is built and run by one person, in the open. Bug reports and
        suggestions are genuinely welcome — most of what the site does started
        as someone saying it was annoying.
      </p>

      {/* ── How to reach the project ── */}
      {/* One card when there is no mailbox to publish: a second card whose
          only message is "there is no second route" is worse than no card. */}
      <section
        className={`mt-10 grid gap-3 ${CONTACT_EMAIL ? "sm:grid-cols-2" : ""}`}
      >
        <a
          href={`${REPO_URL}/issues/new`}
          target="_blank"
          rel="noreferrer"
          className="pressable glass-card flex flex-col gap-1 p-5 transition-colors hover:border-line-hi"
        >
          <span className="text-sm font-semibold">Open an issue ↗</span>
          <span className="text-xs leading-relaxed text-ink-mute">
            Best for bugs. Public, tracked, and you can see it get fixed. Needs
            a GitHub account.
          </span>
        </a>

        {CONTACT_EMAIL ? (
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("F1 Duel — feedback")}`}
            className="pressable glass-card flex flex-col gap-1 p-5 transition-colors hover:border-line-hi"
          >
            <span className="text-sm font-semibold">Send an email</span>
            <span className="text-xs leading-relaxed break-all text-ink-mute">
              {CONTACT_EMAIL}
            </span>
          </a>
        ) : null}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-ink-mute">
        A useful bug report says what you did, what you expected, and what
        happened instead — plus the race and your device if it looked wrong on
        screen. Screenshots help more than anything.
      </p>

      {/* ── FAQ ── */}
      <section className="mt-14">
        <h2 className="display text-2xl font-extrabold tracking-tight">
          Questions people actually ask
        </h2>
        <div className="glass-card mt-5 px-5 py-2 sm:px-6">
          <Faq q="Is this an official Formula 1 product?">
            <p>
              No. It&apos;s an unofficial fan project with no connection to
              Formula 1, the FIA or any team. No money changes hands, there are
              no prizes, and nothing here is a betting product.
            </p>
          </Faq>

          <Faq q="How is a prediction scored?">
            <p>
              Ten points for a driver in exactly the right position, five for
              one place off, two for anywhere else in the top 10 — each
              multiplied by how unlikely the model thought that call was, up to
              ×3. Bonuses on top for the podium, a perfect ten, Driver of the
              Day, the safety-car bet and for beating the model.
            </p>
            <p>
              The whole formula, with the numbers, is on the{" "}
              <Link href="/rules" className="text-race underline">
                rules page
              </Link>
              .
            </p>
          </Faq>

          <Faq q="When do predictions lock?">
            <p>
              At lights out on Sunday. Until then you can rearrange your top 10
              as often as you like — only the last version counts. Nobody, the
              model included, can see your picks before the lock.
            </p>
          </Faq>

          <Faq q="Why does the model play a different order from the one on its own page?">
            <p>
              Because a model that always ranks the grid in form order would win
              every duel it couldn&apos;t lose and lose every one it couldn&apos;t
              win. Its duel entry is calibrated against a grid prior, which makes
              it play like a strong, careful human rather than a machine reading
              out a leaderboard.
            </p>
            <p>
              The reasoning is on{" "}
              <Link href="/model" className="text-race underline">
                the model page
              </Link>
              .
            </p>
          </Faq>

          <Faq q="Why does the model already have a season score?">
            <p>
              It plays every Grand Prix whether or not anyone is watching, so it
              has been scoring since the season started. Because that would put
              it far ahead of anyone joining today, its season total can be
              reset to zero so that everybody — the machine included — starts
              the table from the same race.
            </p>
            <p>
              A reset never touches a race result: every Grand Prix page still
              shows what the model actually scored that weekend, and your duel
              record against it stands.
            </p>
          </Faq>

          <Faq q="Can I change my championship picks?">
            <p>
              No — that&apos;s the deal. One call on the drivers&apos; and
              constructors&apos; titles, locked the moment you confirm, and the
              longer the odds when you called it the bigger the season-end
              bonus.
            </p>
          </Faq>

          <Faq q="Can I play with just my friends?">
            <p>
              Yes. Create a league on the{" "}
              <Link href="/game/standings" className="text-race underline">
                standings page
              </Link>{" "}
              and send the invite link. A league is the same board scored the
              same way — you just see your friends instead of everyone.
            </p>
          </Faq>

          <Faq q="What do you know about me, and can I get rid of it?">
            <p>
              Email, username, name, and optionally country and birth year —
              plus your game data. You can delete the lot yourself from your
              profile page, and it goes immediately and permanently.
            </p>
            <p>
              The full notice is on the{" "}
              <Link href="/privacy" className="text-race underline">
                privacy page
              </Link>
              .
            </p>
          </Faq>

          <Faq q="Something scored wrong. Now what?">
            <p>
              Tell me — with the race and, if you can, what you think the score
              should have been. Scoring runs automatically after each Grand
              Prix from the official classification, so a wrong score is either
              a bad result feed or a real bug, and both are worth knowing about.
            </p>
          </Faq>
        </div>
      </section>

      {/* ── Credits ── */}
      <section className="mt-14">
        <h2 className="display text-2xl font-extrabold tracking-tight">Credits</h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
          <p>
            Built, designed and maintained by{" "}
            <a
              href={AUTHOR_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink underline"
            >
              {AUTHOR}
            </a>
            . The prediction model, the scoring engine, the site and the jobs
            that run the season are all in{" "}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              one open repository
            </a>{" "}
            — read it, or take it apart.
          </p>
          <p>
            Timing, results and roster data come from{" "}
            <a
              href="https://docs.fastf1.dev"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              FastF1
            </a>{" "}
            and the{" "}
            <a
              href="https://api.jolpi.ca/ergast/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Jolpica-F1 API
            </a>
            , the community projects this game would not exist without. The
            model itself is gradient-boosted trees over historical race data;
            the calibration that turns its forecast into a duel entry is the
            project&apos;s own.
          </p>
          <p className="text-ink-mute">
            F1 Duel is an unofficial fan project, not associated with Formula 1,
            the FIA or any team. &ldquo;F1&rdquo; and &ldquo;Formula 1&rdquo;
            are trademarks of Formula One Licensing BV, used here descriptively
            and without endorsement. Season {CURRENT_SEASON}.
          </p>
        </div>
      </section>
    </main>
  );
}
