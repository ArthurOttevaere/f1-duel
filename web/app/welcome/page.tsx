import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { hasDetails } from "@/lib/auth";
import UsernameForm from "@/components/UsernameForm";
import PlayerDetailsForm from "@/components/PlayerDetailsForm";

export const metadata = { title: "Welcome" };

/** Only ever bounce back inside the app. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/game";
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const needsName = data?.username_set === false;
  const needsDetails = !(await hasDetails());

  // Nothing left to ask.
  if (!needsName && !needsDetails) redirect(safeNext(next));

  // The name goes first — it's the one thing other players see. Claiming it
  // comes back here, where only the details step is left standing.
  const backHere = `/welcome?next=${encodeURIComponent(safeNext(next))}`;

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div className="page-glow" />

      <Link
        href="/"
        className="mb-8"
      >
        <Wordmark />
      </Link>

      <div className="glass-card w-full max-w-sm p-6 sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          {needsName && needsDetails ? "Step 1 of 2" : "One last thing"}
        </p>

        {needsName ? (
          <>
            <h1 className="display mt-2 text-xl font-extrabold tracking-tight">Pick your name</h1>
            <p className="mt-2 text-sm text-ink-dim">
              This is how you appear on the standings, in leagues and on your
              profile. You can change it later from your profile.
            </p>

            <div className="mt-6">
              <UsernameForm
                initial={data?.username ?? ""}
                mode="choose"
                next={backHere}
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="display mt-2 text-xl font-extrabold tracking-tight">Tell us who you are</h1>
            <p className="mt-2 text-sm text-ink-dim">
              So we know who&apos;s actually playing. This stays private — your
              username is the only thing other players ever see.
            </p>

            <div className="mt-6">
              <PlayerDetailsForm next={safeNext(next)} />
            </div>

            <p className="mt-4 text-center text-xs text-ink-mute">
              <Link href="/privacy" className="underline">
                What we do with your data
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
