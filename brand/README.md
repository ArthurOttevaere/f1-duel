# Brand assets

Pieces of the identity that exist as files rather than as code, because they are
used **off the site** — in a phone's photo picker, in a story editor, in a slide.
Everything the site itself renders lives in `web/` and is drawn, not stored:
the logomark is `web/public/logo-mark.svg` and `components/Logomark.tsx`, the
race poster is `web/lib/poster/draw.ts`.

## `story-background-{signed,bare}.png`

1080 × 1920, the native size of an Instagram story. The site's own ground — the
dark gradient, the hero grid masked to a soft ellipse, the red aurora top right
and its blue counterweight bottom left — with the middle left empty so a
screenshot or a race poster can be dropped on top of it.

- **signed** carries the finish line, the lockup and `f1-duel.com` at the bottom.
  They sit at y ≈ 1620, above the reply bar Instagram paints over the bottom
  ~250px: furniture any lower is furniture nobody sees.
- **bare** is the same ground with nothing on it.

Both were drawn on a canvas with the same recipe as the poster's background
(`drawBackground` in `web/lib/poster/draw.ts`) at 2× and downscaled, which is
why they match the site rather than approximating it. Regenerating them means
porting that function to a 1080 × 1920 canvas again — they are output, and the
drawing code is the source.

**Why files at all:** a story background is picked from a camera roll. There is
no browser in that moment to render one.
