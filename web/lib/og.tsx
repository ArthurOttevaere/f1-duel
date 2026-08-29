import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import { PALETTE } from "@/lib/palette";

/**
 * The share card, in one place.
 *
 * Every `opengraph-image` route on the site draws the same sheet: the lockup,
 * an eyebrow, a headline, a line of stats, and the checkered strip that closes
 * every page of the site. Only the words change.
 *
 * Written with inline styles and no Tailwind on purpose — `ImageResponse`
 * renders through Satori, which understands a deliberately small subset of CSS
 * and no stylesheet at all. Flex everywhere: Satori has no block layout, and a
 * `<div>` with more than one child and no `display: flex` throws at render.
 *
 * ## Why this file carries font files
 *
 * Satori reads no stylesheet, so it also inherits no font: given none it falls
 * back to its own bundled face, and the card comes out in a typeface that
 * appears nowhere else on the site. That is what these cards did until now —
 * the most-seen surface the project has, since it is what a stranger meets
 * first in a group chat, was the one surface not in the charte.
 *
 * The three cuts below are the charte's three voices (DESIGN §3.3): Archivo for
 * running text, Archivo at display width for the headline and the name, Geist
 * Mono for anything that is a number or a label. They are committed rather than
 * fetched at render time — a card that has to reach fonts.gstatic.com before it
 * can answer is a card that sometimes doesn't. Both families are OFL.
 *
 * Google Fonts has no static instance at `wdth 118`, the width `.display` uses;
 * it offers `semi-expanded` (112.5) and `expanded` (125) and nothing between.
 * This takes 112.5 — the same rung the canvas poster lands on, for the same
 * reason and by a different route (`lib/poster/draw.ts`).
 */

const INK_MARK = PALETTE.ink;

/**
 * Fonts and the logomark, read once per server instance.
 *
 * `new URL(…, import.meta.url)` is the pattern Next documents for this: the
 * bundler rewrites it into an asset reference, so the files are emitted and
 * traced into the deployment instead of being looked for at a path that only
 * exists on a laptop.
 *
 * The mark is recoloured on the way through, exactly as the poster does it
 * (`loadLogomark` in `lib/poster/draw.ts`) and for the same reason: the file
 * paints itself in `currentColor`, which resolves to black once it is an image
 * rather than an element in the page. The car stays knocked out, so it shows
 * the card's own ground.
 */
let assets: Promise<{
  fonts: {
    name: string;
    data: Buffer;
    weight: 400 | 700 | 800;
    style: "normal";
  }[];
  mark: string;
}> | null = null;

function loadAssets() {
  assets ??= (async () => {
    // `readFile` rather than `fetch`: the bundler resolves these to `file:`
    // URLs and Node's fetch refuses that scheme ("not implemented... yet...").
    // readFile takes a file URL directly, which is the same asset reference
    // without the network in the middle.
    const bytes = (path: string) => readFile(new URL(path, import.meta.url));
    const [regular, display, mono, markSvg] = await Promise.all([
      bytes("./fonts/Archivo-Regular.woff"),
      bytes("./fonts/Archivo-Display-ExtraBold.woff"),
      bytes("./fonts/GeistMono-Bold.woff"),
      readFile(new URL("../public/logo-mark.svg", import.meta.url), "utf8"),
    ]);

    const { x, y, w, h } = { x: 509, y: 244, w: 764, h: 1012 };
    const svg = markSvg
      .replace(
        /<svg\b[^>]*>/,
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">`,
      )
      .replaceAll("currentColor", INK_MARK);

    return {
      fonts: [
        { name: "Archivo", data: regular, weight: 400 as const, style: "normal" as const },
        { name: "Archivo Display", data: display, weight: 800 as const, style: "normal" as const },
        { name: "Geist Mono", data: mono, weight: 700 as const, style: "normal" as const },
      ],
      mark: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    };
  })();
  return assets;
}

/** The mark's proportions inside the lockup, from `components/Wordmark.tsx`. */
const MARK_RATIO = 764 / 1012;

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The palette comes from the one module that holds it for everything drawn
// outside the DOM — this card and the canvas poster (lib/palette.ts).
const { bg: BG, ink: INK, dim: DIM, mute: MUTE, race: RACE } = PALETTE;

export interface CardStat {
  value: string;
  label: string;
}

export async function shareCard({
  eyebrow,
  title,
  subtitle,
  stats = [],
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  stats?: CardStat[];
}) {
  const { fonts, mark } = await loadAssets();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: INK,
          padding: "64px 80px",
          position: "relative",
          // Satori has no cascade to inherit from either, so the running voice
          // is set once here and overridden where a different one is meant.
          fontFamily: "Archivo",
          fontWeight: 400,
        }}
      >
        {/* The hero's red wash, top right — the site's one signature.
            Linear, not radial: Satori renders `radial-gradient(closest-side …)`
            as a ring with a dark hole in the middle, which looked like a bug on
            the card. A corner-anchored linear gradient is handled properly and
            reads the same at this size. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 860,
            height: 560,
            // Fully transparent by 55%, so the box has a wide dead margin and
            // its edges never show. At 72% the corners furthest from the
            // gradient's origin still carried colour and left a visible seam
            // down the middle of the card.
            background:
              "linear-gradient(215deg, rgba(255,30,60,0.34) 0%, rgba(255,30,60,0.09) 30%, rgba(255,30,60,0) 55%)",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* The lockup, at `components/Wordmark.tsx`'s proportions: the mark
              at 1.7em of the type size, half an em of gap, a fifth of an em of
              tracking. The card used to set "F1 DUEL" by hand, which predates
              the site having a mark at all. */}
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM */}
            <img
              src={mark}
              alt=""
              width={Math.round(51 * MARK_RATIO)}
              height={51}
            />
            <div
              style={{
                display: "flex",
                fontFamily: "Archivo Display",
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: 6,
              }}
            >
              <span style={{ color: RACE }}>F1</span>
              <span>&nbsp;DUEL</span>
            </div>
          </div>

          {/* Mono, because an eyebrow is a label and the charte keeps labels
              and numbers in the mono voice (DESIGN §3.3). */}
          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontFamily: "Geist Mono",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: RACE,
            }}
          >
            {eyebrow}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontFamily: "Archivo Display",
              fontSize: title.length > 34 ? 68 : 84,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          {subtitle && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 30,
                color: DIM,
                maxWidth: 900,
                lineHeight: 1.35,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {stats.length > 0 && (
            <div style={{ display: "flex", gap: 64, marginTop: 8 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span
                    style={{
                      fontFamily: "Geist Mono",
                      fontWeight: 700,
                      fontSize: 46,
                    }}
                  >
                    {s.value}
                  </span>
                  <span
                    style={{
                      fontFamily: "Geist Mono",
                      fontWeight: 700,
                      fontSize: 18,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      color: MUTE,
                      marginTop: 6,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* The finish line, same two rows of squares as the site footer.
              52 columns of 20px = 1040px, which is exactly the width inside the
              80px side padding — one column more and the pattern is cut. */}
          <div style={{ display: "flex", height: 20 }}>
            {Array.from({ length: 52 }, (_, i) => (
              <div
                key={i}
                style={{ display: "flex", flexDirection: "column", width: 20 }}
              >
                <div
                  style={{
                    width: 20,
                    height: 10,
                    background: i % 2 ? BG : "rgba(244,246,250,0.92)",
                  }}
                />
                <div
                  style={{
                    width: 20,
                    height: 10,
                    background: i % 2 ? "rgba(244,246,250,0.92)" : BG,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
