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

/** The project's source, and the author it's credited to. */
export const REPO_URL = "https://github.com/ArthurOttevaere/f1_race_predictor";
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
