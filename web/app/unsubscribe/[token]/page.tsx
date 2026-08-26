import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Email reminders" };
export const dynamic = "force-dynamic";

interface Prefs {
  username: string;
  email_opt_out: boolean;
}

/**
 * The far end of the "turn these emails off" link.
 *
 * Keyed on the token rather than the session: it has to work from a mail
 * client, for someone who is not signed in and may never sign in again. The
 * token is a random unique uuid, so holding it is the credential — the same
 * trade the league invite codes make.
 *
 * **The change is behind a button, not behind the link itself.** Mail clients
 * and corporate scanners prefetch every URL in a message; a GET that opts
 * someone out would opt out everyone whose employer scans their inbox. The
 * page shows the current state and a form; only the POST changes anything.
 */
export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("email_prefs", { p_token: token });
  const prefs = ((data as Prefs[]) ?? [])[0] ?? null;

  async function setOptOut(formData: FormData) {
    "use server";
    const value = formData.get("value") === "true";
    const client = await createClient();
    await client.rpc("set_email_opt_out", {
      p_token: formData.get("token"),
      p_value: value,
    });
    revalidatePath(`/unsubscribe/${formData.get("token")}`);
  }

  return (
    <main className="mx-auto flex min-h-svh w-[min(28rem,calc(100%-2rem))] flex-col justify-center py-16">
      <div className="glass-card p-8 text-center sm:p-10">
        <p>
          <Wordmark />
        </p>

        {!prefs ? (
          <>
            <h1 className="display mt-6 text-xl font-extrabold tracking-tight">This link has expired</h1>
            <p className="mt-2 text-sm text-ink-dim">
              It doesn&apos;t match an account any more. If you still want the
              reminders off, the toggle is on your profile.
            </p>
          </>
        ) : prefs.email_opt_out ? (
          <>
            <h1 className="display mt-6 text-xl font-extrabold tracking-tight">Reminders are off</h1>
            <p className="mt-2 text-sm text-ink-dim">
              {prefs.username}, you won&apos;t hear from us before or after a
              Grand Prix. Your duels still score as normal.
            </p>
            <form action={setOptOut} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="value" value="false" />
              <button
                type="submit"
                className="pressable glass-chip rounded-full px-5 py-2.5 text-sm font-semibold transition-colors hover:border-line-hi"
              >
                Turn them back on
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="display mt-6 text-xl font-extrabold tracking-tight">
              Turn off race reminders?
            </h1>
            <p className="mt-2 text-sm text-ink-dim">
              {prefs.username}, you currently get two emails per Grand Prix: one
              on Saturday when qualifying is done, one on Monday with your
              result. Nothing else, ever.
            </p>
            <form action={setOptOut} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="value" value="true" />
              <button
                type="submit"
                className="pressable btn-race px-6 py-2.5 text-sm font-semibold"
              >
                Turn them off
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-sm">
          <Link href="/game" className="text-ink-mute hover:text-ink">
            ← Back to the duel
          </Link>
        </p>
      </div>
    </main>
  );
}
