import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * What a crawler may take.
 *
 * The disallow list is not about hiding pages — it is about two credentials
 * and three dead ends. A league code and an unsubscribe token are the whole
 * credential in their respective flows (see `supabase/README.md`), so a
 * `/join/<code>` or `/unsubscribe/<token>` URL in a search index hands them to
 * whoever searches. The auth routes and the sign-in screens are simply nothing
 * to land on from Google.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/join/", "/unsubscribe/", "/auth/", "/login", "/welcome"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
