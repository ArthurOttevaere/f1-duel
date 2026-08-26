import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/constants";
import BootScreen from "@/components/BootScreen";
import LogoSprite from "@/components/LogoSprite";
import "./globals.css";

// Archivo, and only Archivo: it is variable on both axes Google ships it with,
// so the running text (wdth 100) and the display voice (wdth 118, set by the
// `.display` class in globals.css) come out of one file rather than two
// families. `axes` has to name `wdth` explicitly — next/font drops every axis
// but weight unless asked.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Predict the top 10 of every Grand Prix and battle a machine-learning model all season long. Rarity-weighted scoring: bold calls pay.";

export const metadata: Metadata = {
  // Absolute, and from the environment: a share card is fetched by WhatsApp or
  // Slack rather than by the browser on the page, so a relative base silently
  // yields a card with no image. See SITE_URL in lib/constants.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "F1 Duel — Beat the model",
    template: "%s · F1 Duel",
  },
  description: DESCRIPTION,
  applicationName: "F1 Duel",
  openGraph: {
    type: "website",
    siteName: "F1 Duel",
    title: "F1 Duel — Beat the model",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "F1 Duel — Beat the model",
    description: DESCRIPTION,
  },
};

// The phone's browser chrome paints itself in this, so the address bar carries
// on from the page instead of ending it in a light grey band.
export const viewport: Viewport = {
  themeColor: "#0a0b10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* The logomark's mask, once per document and *before* anything that
            references it — including BootScreen, whose own copy used to be the
            first definition in the tree and went dead the moment the screen was
            hidden. See LogoSprite. */}
        <LogoSprite />
        <BootScreen />
        {/* The grain (globals.css). One fixed layer over the whole site, three
            per cent, and it is the difference between a surface and a render. */}
        <div className="grain" aria-hidden />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
