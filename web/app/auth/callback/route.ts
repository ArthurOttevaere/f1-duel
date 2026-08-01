import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinationFor } from "@/lib/auth";

// OAuth + magic-link landing: exchange the code, then continue to the game
// (or to /welcome first, when the account still needs to choose a username).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/game";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        `${origin}${await destinationFor(supabase, next)}`,
      );
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
