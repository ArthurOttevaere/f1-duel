/** The live model platform (Flask app on Render). */
export const MODEL_URL =
  process.env.NEXT_PUBLIC_MODEL_URL ?? "http://127.0.0.1:5050";

export const CURRENT_SEASON = Number(
  process.env.NEXT_PUBLIC_SEASON ?? new Date().getFullYear(),
);
