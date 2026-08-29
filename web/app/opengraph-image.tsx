import { OG_CONTENT_TYPE, OG_SIZE, shareCard } from "@/lib/og";

// The default card, inherited by every page that doesn't draw its own.
export const alt = "F1 Duel — predict the top 10, beat the model";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return shareCard({
    eyebrow: "One duel per Grand Prix",
    title: "Beat the model. Every single Sunday.",
    subtitle:
      "Predict the top 10 of every Grand Prix and go head-to-head with a machine-learning model — all season long.",
    stats: [
      { value: "10 pts", label: "exact position" },
      { value: "×3", label: "boldest calls" },
      { value: "+100", label: "perfect top 10" },
    ],
  });
}
