import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import BootScreen from "@/components/BootScreen";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "F1 Duel — Beat the model",
    template: "%s · F1 Duel",
  },
  description:
    "Predict the top 10 of every Grand Prix and battle a machine-learning model all season long. Rarity-weighted scoring: bold calls pay.",
};

// The phone's browser chrome paints itself in this, so the address bar carries
// on from the page instead of ending it in a light grey band.
export const viewport: Viewport = {
  themeColor: "#07080b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BootScreen />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
