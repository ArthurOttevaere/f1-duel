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
