/** In-app page that explains the model. Always available. */
export const MODEL_PATH = "/model";

/**
 * The live Flask prediction platform, if it's actually deployed. We only treat
 * it as linkable when NEXT_PUBLIC_MODEL_URL is set to a real remote URL — a
 * localhost value (dev default) is ignored so the site never links to a machine
 * the visitor can't reach.
 */
const raw = process.env.NEXT_PUBLIC_MODEL_URL?.trim();
export const LIVE_MODEL_URL =
  raw && !/(127\.0\.0\.1|localhost)/.test(raw) ? raw : null;

export const CURRENT_SEASON = Number(
  process.env.NEXT_PUBLIC_SEASON ?? new Date().getFullYear(),
);

/**
 * The site's own absolute origin. Needed because a share card is fetched by
 * WhatsApp or Slack, not by the browser that is on the page: Open Graph URLs
 * have to be absolute, and a relative `metadataBase` silently produces a card
 * with no image.
 *
 * Read from the environment rather than hardcoded so moving to a custom domain
 * is one Vercel variable and no deploy-time edit. `VERCEL_PROJECT_PRODUCTION_URL`
 * is Vercel's own (no scheme), which keeps preview builds pointing at the
 * production origin — a preview generating cards that link to itself would put
 * a throwaway URL into somebody's group chat.
 */
const explicitSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const vercelSite = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
export const SITE_URL = (
  explicitSite ||
  (vercelSite ? `https://${vercelSite}` : null) ||
  "https://f1-race-predictor-one.vercel.app"
).replace(/\/$/, "");

/** The project's source, and the author it's credited to. */
export const REPO_URL = "https://github.com/ArthurOttevaere/f1-duel";
export const AUTHOR = "Arthur Ottevaere";
export const AUTHOR_URL = "https://github.com/ArthurOttevaere";

/**
 * Where players send bugs and ideas. Deliberately an env var: the address is
 * a mailbox that can be created, changed or retired without a deploy, and
 * publishing one on a page is not something to hardcode. Unset (or obviously
 * not an address), /contact simply shows the GitHub route instead.
 */
const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
export const CONTACT_EMAIL =
  contact && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact) ? contact : null;
