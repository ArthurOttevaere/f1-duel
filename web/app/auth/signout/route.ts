import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Sign out and clear the session. Cookies are written straight onto the
// redirect response we return, so the clearing reliably reaches the browser
// (writing to the request cookie store alone can get lost on a manual redirect).
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const response = NextResponse.redirect(
    new URL("/login?signedout=1", request.url),
    { status: 302 },
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.signOut();
  return response;
}
