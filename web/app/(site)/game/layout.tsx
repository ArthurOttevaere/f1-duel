import { redirect } from "next/navigation";
import { needsUsername } from "@/lib/auth";

// Nav + footer come from the shared (site) layout; this only sets the game
// content width and clears the fixed nav.
export default async function GameLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Google sign-ups arrive with a suggested username: no one lands in the
  // standings as `player_3f9a…` without a chance to change it first.
  if (await needsUsername()) redirect("/welcome?next=/game");

  return (
    <main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
      {children}
    </main>
  );
}
