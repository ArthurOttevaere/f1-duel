import Link from "next/link";
import { createClient, getUser } from "@/lib/supabase/server";
import type { LeaguePreview } from "@/lib/types";
import JoinLeagueButton from "@/components/JoinLeagueButton";

export const metadata = { title: "League invite" };

/**
 * Every state of this page is one small centred card. The page owns its own
 * <main> like the rest of the site: the nav is fixed, so the top padding is
 * each page's job.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-[min(28rem,calc(100%-2rem))] flex-1 pt-28 pb-16">
      <div className="glass-card p-8 text-center sm:p-10">
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          League invite
        </p>
        {children}
      </div>
    </main>
  );
}

/**
 * The other end of an invite link: /join/FZ2K9P.
 *
 * It resolves the code through `league_by_code()` — a security-definer read,
 * because whoever opened the link is not a member yet and league RLS would
 * hand them nothing. Signed out, the page still shows what they are being
 * invited to and carries the destination through sign-in.
 */
export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const [{ data }, user] = await Promise.all([
    supabase.rpc("league_by_code", { p_code: code }),
    getUser(),
  ]);
  const league = ((data as LeaguePreview[]) ?? [])[0] ?? null;

  if (!league) {
    return (
      <Frame>
        <h1 className="mt-3 text-xl font-bold">This invite has expired</h1>
        <p className="mt-2 text-sm text-ink-dim">
          No league matches that link — it may have been deleted, or the link
          got cut short on the way here.
        </p>
        <Link
          href="/game/leagues"
          className="pressable glass-chip mt-6 inline-block rounded-full px-5 py-2 text-sm font-semibold hover:border-line-hi"
        >
          Your leagues
        </Link>
      </Frame>
    );
  }

  const size = `${league.member_count} ${league.member_count === 1 ? "player" : "players"}`;

  if (!user) {
    return (
      <Frame>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{league.name}</h1>
        <p className="mt-2 text-sm text-ink-dim">
          {league.owner_username}&apos;s league · {size}
        </p>
        <p className="mt-6 text-sm text-ink-dim">
          Predict the top 10 of every Grand Prix, beat a machine-learning model
          and settle it against your friends. Sign in and you&apos;ll land right
          back here.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}
          className="pressable mt-6 inline-block rounded-full bg-race px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-race-deep"
        >
          Sign in to join
        </Link>
      </Frame>
    );
  }

  if (league.is_member) {
    return (
      <Frame>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{league.name}</h1>
        <p className="mt-2 text-sm text-ink-dim">
          You&apos;re already in this one · {size}
        </p>
        <Link
          href={`/game/standings?league=${league.id}`}
          className="pressable mt-6 inline-block rounded-full bg-race px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-race-deep"
        >
          See the board
        </Link>
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{league.name}</h1>
      <p className="mt-2 text-sm text-ink-dim">
        {league.owner_username}&apos;s league · {size}
      </p>
      <p className="mt-6 text-sm text-ink-dim">
        Same scores as the global board — you just see this league instead of
        everyone.
      </p>
      <JoinLeagueButton code={code} leagueId={league.id} name={league.name} />
    </Frame>
  );
}
