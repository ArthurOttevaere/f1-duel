import { ImageResponse } from "next/og";

/**
 * The share card, in one place.
 *
 * Every `opengraph-image` route on the site draws the same sheet: the wordmark,
 * an eyebrow, a headline, a line of stats, and the checkered strip that closes
 * every page of the site. Only the words change.
 *
 * Written with inline styles and no Tailwind on purpose — `ImageResponse`
 * renders through Satori, which understands a deliberately small subset of CSS
 * and no stylesheet at all. Flex everywhere: Satori has no block layout, and a
 * `<div>` with more than one child and no `display: flex` throws at render.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#07080b";
const INK = "#f4f6fa";
const DIM = "#a7adba";
const MUTE = "#6c7280";
const RACE = "#ff1e3c";

export interface CardStat {
  value: string;
  label: string;
}

export function shareCard({
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
          padding: "72px 80px",
          position: "relative",
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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 6,
                color: RACE,
              }}
            >
              F1
            </span>
            <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: 6 }}>
              DUEL
            </span>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 56,
              fontSize: 24,
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
            gap: 28,
          }}
        >
          {stats.length > 0 && (
            <div style={{ display: "flex", gap: 64, marginTop: 24 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  <span style={{ fontSize: 46, fontWeight: 700 }}>
                    {s.value}
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      color: MUTE,
                      marginTop: 4,
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
    OG_SIZE,
  );
}
