import type { MetadataRoute } from "next";

/**
 * The install manifest. A duel that comes round once a week is worth a home
 * screen icon, and without this the "Add to Home Screen" entry gets the page
 * title and a screenshot of the tab.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "F1 Duel — Beat the model",
    short_name: "F1 Duel",
    description:
      "Predict the top 10 of every Grand Prix and battle a machine-learning model all season long.",
    start_url: "/game",
    display: "standalone",
    background_color: "#0a0b10",
    theme_color: "#0a0b10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
