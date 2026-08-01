import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * The signed-in player's own profile row, deduplicated per request — the nav,
 * the game layout and the page all want it.
 */
export const getOwnProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  // `select("*")` rather than naming username_set: the column arrives with
  // migration 0002, and a deploy that lands first must not break the nav.
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as { id: string; username: string; username_set?: boolean } | null) ?? null;
});

/** Only ever bounce back inside the app. */
export function safePath(next: string | undefined | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/game";
}

/**
 * Where a freshly authenticated session should land.
 *
 * Google and magic-link sign-ups never see the sign-up form, so their profile
 * carries a suggested username rather than a chosen one. Those accounts get
 * one pass through /welcome before anything else. Takes the client that just
 * performed the exchange, whose session is already in memory.
 */
export async function destinationFor(
  supabase: SupabaseClient,
  next: string | undefined | null,
): Promise<string> {
  const safe = safePath(next);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return safe;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // A missing profile means the signup trigger hasn't landed yet: don't trap
  // anyone in a redirect loop over it.
  return data?.username_set === false
    ? `/welcome?next=${encodeURIComponent(safe)}`
    : safe;
}

/** True when the signed-in player still carries an auto-generated username. */
export async function needsUsername(): Promise<boolean> {
  return (await getOwnProfile())?.username_set === false;
}
