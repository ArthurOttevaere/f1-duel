import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import UsernameForm from "@/components/UsernameForm";

export const metadata = { title: "Choose your name" };

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

  // Already chose one — nothing to do here.
  if (data?.username_set) redirect(safeNext(next));

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div className="aurora" />

      <Link
        href="/"
        className="mb-8 font-mono text-sm font-semibold tracking-widest"
      >
        <span className="text-race">F1</span> DUEL
      </Link>

      <div className="glass-card w-full max-w-sm p-6 sm:p-8">
        <p className="font-mono text-xs tracking-[0.2em] text-race uppercase">
          One last thing
        </p>
        <h1 className="mt-2 text-xl font-bold">Pick your name</h1>
        <p className="mt-2 text-sm text-ink-dim">
          This is how you appear on the standings, in leagues and on your
          profile. You can change it later from your profile.
        </p>

        <div className="mt-6">
          <UsernameForm
            initial={data?.username ?? ""}
            mode="choose"
            next={safeNext(next)}
          />
        </div>
      </div>
    </main>
  );
}
