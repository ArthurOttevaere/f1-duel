import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * A Supabase client with no session attached.
 *
 * `lib/supabase/server.ts` reads `cookies()`, which is a request-time API:
 * anything that touches it renders per request. The sitemap is a crawler's
 * file, not a player's page — it wants public rows and a cache, and it has no
 * session to speak of. This client gives it exactly that, so `sitemap.ts`
 * stays a cached route handler.
 *
 * Public reads only, obviously: nothing signed in works through it.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
