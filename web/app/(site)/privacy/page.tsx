import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description:
    "What F1 Duel collects about you, why, how long it's kept, and how to get it changed or deleted.",
};

/**
 * The GDPR notice. Collecting a real name, country and birth year at signup
 * makes this project a data controller, which owes players a plain answer to
 * "what do you have on me and how do I get rid of it".
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto w-[min(48rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
        Privacy
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">
        What we know about you
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-dim">
        F1 Duel is a personal fan project, not a company. It still handles your
        personal data, so here is the whole of it in plain language.
      </p>

      <div className="mt-12 flex flex-col gap-10 text-sm leading-relaxed text-ink-dim">
        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            What we collect
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            <li>
              <strong className="text-ink">Email address</strong> — required.
              It&apos;s how you sign in and how we&apos;d reach you about your
              account.
            </li>
            <li>
              <strong className="text-ink">Username</strong> — required. This is
              the only thing other players see.
            </li>
            <li>
              <strong className="text-ink">First and last name</strong> —
              required at signup, so we know who is actually playing.
            </li>
            <li>
              <strong className="text-ink">Country and year of birth</strong> —
              optional. Leave them blank and nothing changes for you.
            </li>
            <li>
              <strong className="text-ink">Your game data</strong> — predictions,
              scores, league membership. Predictions become public once the race
              locks; that&apos;s the game.
            </li>
          </ul>
          <p className="mt-4">
            We don&apos;t run advertising, we don&apos;t use tracking or
            analytics cookies, and we don&apos;t profile you. The only cookies
            are the ones that keep you signed in.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Why, and on what basis
          </h2>
          <p className="mt-4">
            Email, username and game data are needed to give you an account and
            run the game — that&apos;s the performance of our agreement with you
            (GDPR Art. 6(1)(b)). Your name, country and birth year are collected
            on the legitimate interest of knowing who uses the project and where
            it&apos;s played (Art. 6(1)(f)). None of it is used for anything
            else.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Who sees it
          </h2>
          <p className="mt-4">
            Your name, country and birth year are stored in a table with no
            public read access: the site itself cannot show them to another
            player, whatever they ask it for. Only you and the project
            maintainer can read them.
          </p>
          <p className="mt-3">
            The database and authentication run on{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-race underline"
            >
              Supabase
            </a>
            , and the site is hosted on{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noreferrer"
              className="text-race underline"
            >
              Vercel
            </a>
            . They process data on our behalf. Nothing is sold or shared with
            anyone else.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            How long
          </h2>
          <p className="mt-4">
            As long as your account exists. Delete the account and everything
            attached to it goes with it — details, predictions and scores are
            removed together, not archived.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Your rights
          </h2>
          <p className="mt-4">
            You can see and correct your details yourself, any time, from your
            profile page — and delete the whole account from the same page,
            which removes your details, predictions, scores and league
            membership immediately and for good. You also have the right to a
            copy of your data, to object to the processing, and to complain to
            your national data protection authority.
          </p>
          <p className="mt-3">
            For a copy of your data, or anything the delete button doesn&apos;t
            cover, email{" "}
            <a
              href="mailto:arthurottevaere7@gmail.com"
              className="text-race underline"
            >
              arthurottevaere7@gmail.com
            </a>
            . We&apos;ll act on it within a month.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Under 13
          </h2>
          <p className="mt-4">
            The game isn&apos;t meant for children under 13, and accounts
            declaring a birth year under that age are refused. If one slipped
            through, email us and it goes.
          </p>
        </section>
      </div>

      <p className="mt-12 border-t border-line pt-6 text-xs text-ink-mute">
        An unofficial fan project — not associated with Formula 1 or the FIA.
        See also the{" "}
        <Link href="/rules" className="underline">
          game rules
        </Link>
        .
      </p>
    </main>
  );
}
