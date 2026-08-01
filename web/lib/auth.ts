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

/**
 * Whether the player still owes us their details, deduplicated per request.
 *
 * A query error means the 0003 migration hasn't landed on this project yet —
 * report "nothing owed" rather than trapping every account in a /welcome loop
 * it has no table to write to.
 */
export const hasDetails = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return true;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_details")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  return error ? true : Boolean(data);
});

/** Only ever bounce back inside the app. */
export function safePath(next: string | undefined | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/game";
}

/**
 * Where a freshly authenticated session should land.
 *
 * Google and magic-link sign-ups never see the sign-up form, so their profile
 * carries a suggested username rather than a chosen one and no details row.
 * Those accounts get one pass through /welcome before anything else. Takes the
 * client that just performed the exchange, whose session is already in memory.
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
  if (data?.username_set === false) {
    return `/welcome?next=${encodeURIComponent(safe)}`;
  }

  const { data: details, error } = await supabase
    .from("player_details")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return !error && !details
    ? `/welcome?next=${encodeURIComponent(safe)}`
    : safe;
}

/** True when the signed-in player still carries an auto-generated username. */
export async function needsUsername(): Promise<boolean> {
  return (await getOwnProfile())?.username_set === false;
}

/** True when /welcome still has something to ask the signed-in player. */
export async function needsOnboarding(): Promise<boolean> {
  if (await needsUsername()) return true;
  return !(await hasDetails());
}
