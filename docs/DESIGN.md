# The Design System — F1 Duel

> The visual and interaction language of https://f1-duel.com, written down as
> it actually is. Everything here was read out of `web/` rather than invented
> for the document: if a rule appears below, there is code enforcing it, and if
> the code changes, this file is wrong until it is updated.

**Status:** documents `main` as of 2026-08-26, including the F-series
foundation pass (typeface, ground, red split, grain, shadows, weight
hierarchy).
**Scope:** the Next.js site in `web/`. The Flask model platform
(`webapp/static/css/style.css`) is a separate, older surface that shares the
palette and nothing else.
**Maintenance rule:** same as the Almanac's — a change that alters something
described here updates this file in the same PR. See
[§15 Keeping this document true](#15-keeping-this-document-true).

| Related document | Scope |
| --- | --- |
| [`ALMANAC.md`](ALMANAC.md) | The whole system: architecture, jobs, database, deployment. |
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | The game rules. Several visual decisions here exist to express them. |

---

## Table of contents

1. [Principles](#1-principles)
2. [Brand](#2-brand)
3. [Colour](#3-colour)
4. [Typography](#4-typography)
5. [Layout and space](#5-layout-and-space)
6. [Surfaces and materials](#6-surfaces-and-materials)
7. [Components](#7-components)
8. [Motion](#8-motion)
9. [Imagery and icons](#9-imagery-and-icons)
10. [Responsive behaviour](#10-responsive-behaviour)
11. [Accessibility](#11-accessibility)
12. [Data visualisation](#12-data-visualisation)
13. [Voice and content](#13-voice-and-content)
14. [Off-site surfaces](#14-off-site-surfaces)
15. [Keeping this document true](#15-keeping-this-document-true)
16. [Appendix — token reference](#16-appendix--token-reference)

---

## 1. Principles

Six rules explain nearly every decision in the rest of this document. They are
ordered: when two conflict, the earlier one wins.

### 1.1 The rule and the picture are the same thing

The game's central mechanic is that **points are multiplied by how unlikely the
model thought your pick was**. Wherever that rule shows up visually, the visual
*is* the rule — the probability chart's five colour bands are the five
multiplier tiers, not a decorative ramp, so reading the chart teaches the
scoring. Never invent a scale that merely looks like the rule.

### 1.2 Colour is never the only channel

Every quantity is printed as text beside its colour. Every state has a shape or
a word as well as a hue. This is an accessibility floor, but it is also why the
charts survive a phone screen in daylight.

### 1.3 Nothing waits in silence

Any control that fires off work shows a spinner until the work comes back; any
route that can be slow has a `loading.tsx`. There is one spinner
(`components/Spinner.tsx`) and one full-page loader (`components/RaceLoader.tsx`)
— no variants, no exceptions. This is a house rule, not a preference.

### 1.4 Separate with space and type, never with a band

The home page carries no section backgrounds. Two attempts at one — a white
veil (`.zone-fade`), then a blue radial glow (`.zone-glow`) — were both removed
because the reason a section drew the eye was that *only one of them had a
background at all*. A new section is announced by its red eyebrow, its heading
and 6rem of air. The hero's aurora is the single exception, which is what makes
it a signature rather than a motif.

### 1.5 The phone is not a narrower desktop

A table that needs 32–36rem gets a **phone twin**, not a horizontal scrollbar:
iOS draws no bar for overflow, so a column past the edge is a column that does
not exist. Two surfaces are built as twins — the race breakdown and the
standings board. The twin is allowed to show a *different cut* of the data, not
a squeezed one.

The probability matrix was the third, and it is the rule's most useful result:
**the phone cut turned out to be the better chart at every width, and the
desktop one was deleted** (§12.2). Writing for the narrow screen forces the
question "what is actually being asked here", and the answer is not always
narrower — sometimes it is just better.

### 1.6 Comment the decision, not the code

Every non-obvious rule in `web/` carries a comment saying what was tried and
why it lost. That is why this document could be written at all, and it is the
cheapest way to stop a fix from being re-broken. Keep doing it.

---

## 2. Brand

### 2.1 Name and logotype

**F1 Duel.** One component, `components/Wordmark.tsx`, and every appearance of
the name goes through it:

```tsx
<span className="display text-sm font-extrabold tracking-[0.2em] uppercase">
  <span className="text-race">F1</span> Duel
</span>
```

It is set in the **display face** (§4.1) — Archivo at wdth 118, the same width
as every headline — with `F1` in race red and `DUEL` in ink. It was in Geist
Mono until the width axis arrived, which was a category error: mono is this
site's voice for *data* (§4.2), and a name is not data.

Wide letter-spacing, not a wide space between the words: at 14px the expanded
cut needs air or it reads as a bold word rather than as lettering.

It appears in eight places — nav, mobile menu, footer, boot screen, login,
welcome, unsubscribe, 404 — and never any other way. There is no logomark, no
icon, and no wordmark image file. (`TeamWordmark.tsx` is unrelated: it sets a
*constructor's* name in the mono idiom.)

### 2.2 What the brand is about

Human versus machine, once a Grand Prix. The tone is **racing broadcast, not
sports-betting app**: confident, dry, specific about numbers, never hyped and
never cute about the odds. See §13.

### 2.3 Motifs

Three, all drawn in CSS, all borrowed from the sport rather than from a UI kit:

| Motif | Where | Meaning |
| --- | --- | --- |
| **Start-light gantry** (`.start-lights`) | Boot screen, full-page loader | Waiting, about to begin |
| **Checkered edge** (`.checker-edge`) | Above the footer, on the race poster | The end of the page as a finish line |
| **Checkered rule** (`.checker-rule`) | The top edge of the last-race card | The end of *a race*. Half the height, half the rows, dimmer — see §6.4 |
| **Circuit trace** (`CircuitTrace.tsx`) | The hero | *This* Sunday. The ornament is a reading of the calendar. |
| **Faint 72px grid** (`.hero-grid`, `.cover-grid`) | Hero, profile cover | Telemetry / technical drawing |
| **Grain** (`.grain`) | Every page, fixed, 3.2% | Tooth. A surface, not a render. |

Use them where they mean something. A start-light gantry that is not a wait, or
a checkered band that is not an ending, is decoration and does not belong.

The grain is the exception: it means nothing, it is everywhere, and that is the
point. See §6.5.

---

## 3. Colour

Dark only. `color-scheme: dark` is declared on `html` and there is no light
theme, no toggle, and no `prefers-color-scheme` branch anywhere in the
stylesheet. Do not add per-component light fallbacks — they would be dead code.

### 3.1 Core tokens

Declared in `web/app/globals.css` under `@theme`, so every one of them is also
a Tailwind utility (`bg-bg`, `text-ink-dim`, `border-line`, …).

| Token | Value | Role |
| --- | --- | --- |
| `--color-bg` | `#0a0b10` | The page. Also the browser chrome (`viewport.themeColor`) and the manifest. |
| `--color-ink` | `#f4f6fa` | Primary text, and the only white in the system. |
| `--color-ink-dim` | `#a7adba` | Body copy, secondary text. |
| `--color-ink-mute` | `#6c7280` | Labels, metadata, disabled, empty states. Also `NEUTRAL_COLOR`. |
| `--color-race` | `#ff1e3c` | The **signal**. Active state, errors, multipliers, eyebrows, emphasis — and the hover of a red button. |
| `--color-race-deep` | `#c8102e` | The **surface**. The resting fill of any red button or large red area. |
| `--color-glass` | `rgb(255 255 255 / 0.045)` | Chip and inert-row fill. |
| `--color-glass-strong` | `rgb(255 255 255 / 0.07)` | The same, one step up — hover, "this is you". |
| `--color-line` | `rgb(255 255 255 / 0.1)` | Default border. |
| `--color-line-hi` | `rgb(255 255 255 / 0.16)` | Border on hover / focus-within. |
| `--color-card` | `rgb(28 31 40 / 0.72)` | The card fill behind `.glass-card`. |

Three greys, one red in two strengths, two membranes and two hairlines. **Do
not add a colour to this table without deleting one.**

Two notes on the values, because both were arrived at rather than picked:

**The ground is `#0a0b10`, not near-black.** `#07080b` is what you get when
nobody chooses a background, and a red sitting on true black has nothing to sit
on. Two points of blue is the whole change and it reads on every page.

**The red splits by area, not by state.** At full saturation `#ff1e3c` is a
signal — perfect for two per cent of a screen, a shout across two hundred
pixels of button. It is also 3.8:1 against white, under the 4.5:1 a button
label needs. `--color-race-deep` is 5.9:1 and unmistakably the same red, so it
takes the fills; `race` is what a button *becomes* under the cursor. The accent
moved into the interaction rather than out of the palette.

### 3.2 Semantic tones

The only hues outside the core palette, and each has exactly one meaning:

| Tone | Class | Means | Used in |
| --- | --- | --- | --- |
| Emerald | `text-emerald-400` (`#34d399` on the poster) | Exact hit, positive margin, won the duel | Race breakdown, standings, poster |
| Amber | `text-amber-300` (`#fbbf24` on the poster) | One place off, a draw, a caution | Race breakdown, poster |
| Race red | `text-race` | Error text, multipliers, the model winning | Everywhere |
| Ink-mute | `text-ink-mute` | Missed, nothing there, not applicable | Everywhere |

Note the deliberate overload: **red is both the brand accent and the failure
tone.** It works because red is never the only signal — an error is a short
sentence, and the model's win is labelled. Do not introduce a separate error
red.

### 3.3 Constructor colours

Team colour is data, not design. `drivers.team_color` comes from FastF1 and is
nullable, so `lib/teams.ts` resolves it in a fixed order and every consumer goes
through one of its helpers:

- `driverColor(driver)` — a driver's stripe, avatar wash, chip.
- `teamColor(team, roster)` — a constructor on its own.
- `seasonPickColor(pick, roster)` — the colour a profile wears all season.
- `tint(color, alpha)` — the *only* way to make a translucent version. Never
  paste an alpha suffix onto a hex string; the database can hand back a
  three-digit hex or an `rgb()` string and that silently produced no colour at
  all.

`NEUTRAL_COLOR` (`#6c7280`) is the last resort. **Red is never a neutral
fallback** — it is Ferrari's colour here, and a Mercedes pick once came out
looking like a Ferrari one because of that.

### 3.4 Probability bands

The one sequential scale in the system. Single hue, low→high, **never a
rainbow**. The five stops are the game's multiplier tiers (`GAME_DESIGN` §2.2),
defined once in `components/ProbabilityGrid.tsx`:

| Probability | Fill | Multiplier |
| --- | --- | --- |
| 30%+ | `rgb(255 30 60 / 0.88)` | ×1 |
| 15–30% | `rgb(255 30 60 / 0.55)` | ×1.5 |
| 5–15% | `rgb(255 30 60 / 0.3)` | ×2 |
| 2–5% | `rgb(255 30 60 / 0.14)` | ×3 |
| under 2% | `rgb(255 255 255 / 0.03)` | ×3 |

Text sits **on top of** its own fill, and it is **light** ink at every band —
counter-intuitive for the brightest one, and checked rather than guessed: the
strongest fill composites to about `#e11b36`, which is 4.9:1 against `#f4f6fa`
and only 4.0:1 against the page black. The middle band is not close — 10:1
light, 1.9:1 dark.

### 3.5 Shadows and glows

Three tokens, declared in `@theme` beside the colours, and nothing hand-rolls a
shadow any more:

| Token | Value | For |
| --- | --- | --- |
| `--shadow-panel` | `0 22px 56px rgb(3 5 16 / 0.62)` | `.glass-card`, desktop. |
| `--shadow-panel-sm` | `0 10px 24px rgb(3 5 16 / 0.44)` | The same card on a phone (§10.3). |
| `--shadow-race` | `0 10px 30px rgb(168 12 40 / 0.38)` | The glow under `.btn-race`, and nowhere else. |

**A shadow takes the hue of what is behind it.** Pure black at low opacity is
the default nobody picked, and it greys a card rather than lifting it — these
are the page ground pushed darker and a touch bluer. The red glow is tinted to
`race-deep`, the colour the button actually is, not to the brighter red it used
to borrow.

The aurora (§6.3) is the only other light source on the site.

---

## 4. Typography

### 4.1 The two faces, and the third that is the first again

| Face | Variable | Loaded as | Carries |
| --- | --- | --- | --- |
| **Archivo** | `--font-archivo` → `font-sans` | `next/font/google`, latin subset, `axes: ["wdth"]` | All prose, buttons, names |
| **Archivo, wdth 118** | `.display` | The same file | Headlines, the wordmark, the nav labels |
| **Geist Mono** | `--font-geist-mono` → `font-mono` | `next/font/google`, latin subset | Every number, label, code, position, timer |

Both families are self-hosted by `next/font`, so there is no external font
request and no FOUT to design around. `-webkit-font-smoothing: antialiased` and
`text-rendering: optimizeLegibility` are set on `body`.

**Why Archivo.** Inter is an excellent typeface and a completely anonymous one:
it is the default of every generated interface, and it says nothing about this
sport or this game. Archivo is a grotesque built to be read small and to be
monumental large, which is the register of pit boards, timing towers and the
name across the top of a livery.

**One family, two widths.** Google ships Archivo variable on both `wdth`
(62–125) and `wght` (100–900), so the display voice is the *same file* opened
along its width axis — no second family, no second request. The served
`@font-face` carries `font-stretch: 62% 125%`; if that line ever disappears
from the build, the width axis went with it and `.display` silently stops
doing anything.

```css
.display {
  font-variation-settings: "wdth" 118;
}
```

Width only. Tracking stays with the utility on each element — a 72px headline
and a 14px uppercase wordmark want opposite amounts of it, and `.display` is
unlayered, so a `letter-spacing` in here would beat every `tracking-*` it
touched.

### 4.2 The mono rule

**Mono means "this is data."** Points, percentages, multipliers, countdowns,
positions (`P4`), round numbers, driver codes, dates, the logotype, and every
small-caps label. Prose is never mono; a driver's *name* is sans, their *code*
is mono.

Numbers that update in place (countdowns, live scores) additionally take
`tabular-nums` so digits do not jitter.

### 4.3 Scale

Measured across `web/app` and `web/components` — this is the real distribution,
not an aspiration:

| Role | Classes | Notes |
| --- | --- | --- |
| Hero headline | `display text-4xl … sm:text-7xl`, `font-extrabold tracking-tight`, `leading-[1.05]`/`sm:leading-[1.02]` | Home only. One per site. |
| Page title (h1) | `display text-4xl font-extrabold tracking-tight sm:text-5xl` | Every top-level page. |
| Section title (h2) | `display text-2xl font-extrabold tracking-tight` | The workhorse — 32 uses. |
| Card title (h3) | `display text-lg font-extrabold tracking-tight` | |
| Section **label** (h2/h3) | `text-sm font-semibold tracking-wide text-ink-dim` | **No `.display`, no negative tracking.** Nine of the site's h2s are these. |
| Lead paragraph | `text-lg leading-relaxed text-ink-dim` | Directly under an h1. |
| Body | `text-sm leading-relaxed text-ink-dim` | The default. 200 uses — if in doubt, this. |
| Metadata | `text-xs text-ink-mute`, usually mono | |
| Micro-label | `text-[0.65rem]` / `text-[0.6rem]`, mono, `tracking-wider uppercase` | Column headers, chip labels. |

`tracking-tight` on every heading; `tracking-wider`/`tracking-widest` only on
uppercase mono, and on the wordmark. Never letter-space lowercase sans.

**Hierarchy is carried by weight and width, not only by three greys.** Every
heading used to be the same `font-bold` and the ranking was left entirely to
ink / ink-dim / ink-mute — consistent, and monotone: one channel doing all the
work, and it runs out after three steps. Headlines are 800 at wdth 118; labels
are 600 at natural width with *positive* tracking, which is what makes them
read as labels rather than as small headlines. And a text does not drop to
`ink-mute` merely for being secondary — that is what the weight is for now.

This is deliberately **not** an `h1, h2 { … }` element rule. Nine of the site's
h2s are `text-sm` section labels, and an unlayered element selector would have
silently overridden every one of them.

### 4.3.1 No orphans

```css
h1, h2, h3, h4 { text-wrap: balance; }
p, li, dd, figcaption { text-wrap: pretty; }
```

Two rules in `globals.css`, and no headline on the site drops its last word
onto a line of its own at an intermediate width. It is most of the difference
between a page that was set and a page that was rendered.

### 4.4 The eyebrow

The site's most repeated typographic device — 40+ uses. A short uppercase mono
line above a heading, in red when it announces a section, in ink-mute when it
labels a value:

```tsx
<p className="font-mono text-xs tracking-[0.2em] text-race uppercase">The opponent</p>
<h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">…</h1>
```

Per §1.4, the eyebrow *is* the section divider. Two lines maximum, no
punctuation.

The home hero's line is the same device carrying live data —
`Round 13 · Italian Grand Prix · Lights out in 2d 14h`, the countdown lifted
to full `text-ink` so the number is the emphasis rather than a colour change.
It replaced a `.glass-chip` strip: a container drawn around information the
type could carry on its own. **A box is not an eyebrow.**

### 4.5 Emphasis

`<strong className="text-ink">` — a lift from dim to full ink, not a colour
change. Red bold text is reserved for numbers and multipliers.

### 4.6 `.hero-outline` — the stencil

One line on the whole site: the hero's second line, cut out of the page rather
than filled.

```css
.hero-outline {
  color: transparent;
  -webkit-text-stroke: 1.25px var(--color-race);   /* 2px from sm up */
  paint-order: stroke fill;
}
```

It replaced `bg-gradient-to-r from-race to-[#ff7a5c] bg-clip-text
text-transparent`, which was the most recognisable AI tell on the site:
gradient text dates from 2021 and is the first reflex of any model asked for a
hero. A stencil is what a pit board, a vinyl number and a helmet visor band
actually are.

The stroke is drawn centred on the glyph outline, so it has to **grow with the
type** or it disappears at 72px — hence two widths rather than one. It is a
display device and nothing else: never use it under 36px, and never on more
than one line.

---

## 5. Layout and space

### 5.1 Containers

Three widths, and a page picks one:

| Width | Used for |
| --- | --- |
| `w-[min(64rem,calc(100%-2rem))]` | The default. Nav, footer, and every content page. |
| `w-[min(48rem,calc(100%-2rem))]` | Long-form reading: rules, privacy, contact. |
| `w-[min(28rem,calc(100%-2rem))]` | A single form: login, welcome, unsubscribe. |

The `calc(100%-2rem)` half is what gives every page the same 1rem phone gutter
without a `px-4` on each one. Do not swap in `max-w-* mx-auto px-4`.

**One exception, and it is the home hero.** It runs `w-[min(72rem,100%)]`
because it is a two-column composition rather than a column of reading, and
its `px-4` lives on the section. Between seasons — no circuit, so no second
column — it falls back to the long-form 48rem rather than hugging the left of
an empty half. Nothing else on the site is 72rem.

### 5.2 Page frame

```tsx
<main className="mx-auto w-[min(64rem,calc(100%-2rem))] flex-1 pt-28 pb-8">
```

`pt-28` clears the fixed nav — the nav floats over the page rather than
reserving space, so top padding is the page's job. `flex-1` inside the
`flex min-h-full flex-col` body is what pins the footer to the bottom on short
pages.

### 5.3 Vertical rhythm

| Step | Class | Between |
| --- | --- | --- |
| 6rem | `mt-24` | Content and the footer |
| 4rem | `mt-16` | Major sections of a page |
| 2rem | `mt-8` | A heading block and its grid of cards |
| 1.5rem | `mt-6` | A heading and its content |
| 1rem | `mt-4` | Related blocks |
| 0.5rem | `mt-2` | A label and its value |

Grids use `gap-4` between cards, `gap-2`/`gap-1.5` between list rows.

### 5.4 Radii

**Two tokens, and a capsule kept for two jobs.**

| Radius | Token / class | For |
| --- | --- | --- |
| 5px | `--radius-control` → `rounded-control` | Anything you press or type into: buttons, fields, chips, list rows, tiles, segments. |
| 10px | `--radius-panel` → `rounded-panel` | Anything that *holds* things: `.glass-card`, the nav bar, sheets, large panels. |
| 9999px | `rounded-full` | A badge, a status dot — and shapes that genuinely are circles. |
| 0 | *(nothing)* | Bars and stripes. |

The site was **76 `rounded-full`**: every button, chip, badge and field was a
capsule. The capsule is the default control of the last few years, and it is
*soft* — where the visual language of this sport is rectangular and technical.
Pit boards, timing towers, number plates, entry tickets.

Inner corners are tighter than outer ones, so a control inside a panel is 5
inside 10. That relationship is the rule; the absolute values matter less.

**Where the capsule survives, and why:**

- **A badge** (`bg-race/15 px-2 py-0.5` — the `YOU` marker) and **a status
  dot**. Both are read as *shapes* rather than as surfaces, and both would
  read as very small buttons at 5px.
- **Things that are circles.** Driver and profile avatars, the start-light
  bulbs, the spinner, a toggle knob and its track, the sheet's grab handle,
  and a bare-icon tap target (`size-10`, the hamburger and the ✕). A round hit
  area around an icon is a *target*, not a control surface.

**Bars lost their caps.** Constructor stripes, the pick-progress segments, the
nav's active underline, the chart legend swatches: pill ends on a 2px rule are
a UI-kit habit. Square-ended is what a timing bar actually looks like, and at
that size it costs nothing to be right.

### 5.5 Numbered sequences

**A sequence of steps is a hanging numeral and a hairline. It is never a row of
equal cards.**

```tsx
<ol className="border-b border-line">
  <li className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-t border-line py-7
                 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-8 sm:py-9">
    <span aria-hidden className="font-mono text-2xl font-semibold text-race tabular-nums sm:text-4xl">01</span>
    <div>…</div>
  </li>
</ol>
```

Three glass cards in `sm:grid-cols-3`, each with a red mono numeral, is what
any model produces when asked "how does it work", and this site had it twice —
the home page's *The game* and `/model`'s pipeline, from the same generation
session. It also fought §1.4: three cards is three bands doing the work that
space and type should do.

The numeral is `aria-hidden`, because the `<ol>` already numbers the list and a
screen reader would otherwise count everything twice. And the number is only
allowed at all when the content **is** a sequence — steps that happen in order.
A set of features numbered 01–04 is decoration pretending to be structure.

---

## 6. Surfaces and materials

The site has exactly one background (`--color-bg`) and everything on it is one
of four membranes.

### 6.1 `.glass-card` — the card

```css
background: var(--color-card);           /* rgb(28 31 40 / 0.72) */
border: 1px solid var(--color-line);
border-radius: 1.25rem;
box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.07),  /* top-edge highlight */
            var(--shadow-panel);
```

The inset highlight is what makes it read as a lit pane rather than a grey box.
Padding is the caller's: `p-3` for a dense list, `p-5`/`p-6` for a content card,
`p-8` for a feature panel.

**On phones the drop is cut to `--shadow-panel-sm`** — see §10.3.

### 6.2 `.glass-chip` — the floating element

`--color-glass` fill, `--color-line` border, `backdrop-filter: blur(14px)`. The
nav bar and secondary buttons. It is the only place `backdrop-filter` is used,
and it has a consequence worth knowing: **a `backdrop-filter` creates a
containing block**, which traps `position: fixed` descendants. The mobile menu
overlay is portalled to `<body>` for exactly this reason.

### 6.3 The circuit trace — the hero light

`components/CircuitTrace.tsx`. The next Grand Prix's circuit, drawn as **one
closed hairline**, with the start/finish line ticked in red and a mono caption
naming it:

```
ZANDVOORT · ROUND 12 · 14 CORNERS
```

**What it replaced.** The hero used to carry `.aurora`: two blurred radial
gradients, a 60rem red blob top-right and a 44rem blue counterweight
bottom-left. It was the site's only ornament, and it was also its most generic
gesture — an "ambient glow" is the first thing any generated hero reaches for,
and two soft blobs stay two soft blobs however carefully they are placed.

The trace keeps what was right about it (**one light source, and only in the
hero**) and changes the material. The glow is still there; it sits behind the
thing it is lighting now instead of in a corner. **The blue counterweight did
not come back — one light source means one.**

**It has two forms, and they never appear together.**

*From `lg` up — `HeroRaceCard`.* The right-hand column of the hero: the
circuit, a hairline rule, then what it is and how long is left.

```
   ╭──────╮
 ──╯      ╰─╮        ITALIAN GRAND PRIX
   ╰──╮  ╭─╯         MONZA · ROUND 13 · 11 CORNERS
      ╰──╯▌
                     LIGHTS OUT IN
                     02 : 14 : 06 : 22
                      D    H    M    S
```

Drawn as content, not wallpaper: full contrast, a red start line, a caption.
A trace at six per cent behind the headline would have been the aurora again
with extra steps. **It is not a link** — two labelled buttons sit a few
centimetres away, and a block of data that lights up under the cursor reads as
a button somebody forgot to finish.

*Below `lg` — `HeroTraceBleed`.* The card would sit under the buttons, which
is where nobody looks and no ornament earns its keep. The same geometry runs
in from the top-right corner instead: oversized, cropped by the hero's frame,
`aria-hidden`, no caption. That corner is exactly where the old aurora blob
was; this is the same gesture with real geometry in place of a blur.

Two things make it survive the calendar rather than one circuit:

- **`preserveAspectRatio="xMaxYMin meet"` in a fixed box.** Scaling by width
  alone gives a band across the corner in September (Monza is 2.3× wider than
  tall) and a single vertical edge in July (the Hungaroring is taller than
  wide). Fitting each circuit to a box and pinning the *same corner* of it
  off-screen makes every one bleed the same way.
- **Two masks, nested rather than composited.** One fades the drawing out
  leftwards so it never reaches the column the text starts in; the other fades
  it downwards so it stops above the headline. Nesting avoids
  `mask-composite`, which still needs a prefixed second spelling.

**The geometry is data.** `web/lib/circuits.ts` is generated by
`jobs/build_circuit_traces.py` from FastF1 position telemetry — the fastest
race lap at that venue — simplified and re-emitted as a closed Catmull-Rom
spline in its own viewBox. So the ornament comes out of the same pipeline the
model runs on, and it changes every second Sunday. A venue that has never been
raced (a new circuit, a returning one) is simply absent from the file and the
hero carries no ornament, which is better than carrying somebody else's
circuit.

**Line weight does not scale.** Every stroke is `vector-effect:
non-scaling-stroke` — 1.75px for the track, 2.5px for the start line, at any
display size. This is a technical drawing, and a technical drawing's line
weight is a property of the pen, not of the paper.

The hero still fades its own bottom 8rem to `--color-bg` so the glow is never
cut at the section change. Eight rem and no more: fourteen was tried and it
reached far enough up to dim the grid.

**`.page-glow`** is the reduced version for `/login` and `/welcome`, which
carried the aurora too — and for the home hero between seasons, when there is
no circuit to light. One red source from the top, no second blob.

### 6.3.1 The clock

`NextRaceCountdown` renders in two shapes and the hero uses exactly one of
them at a time:

| Variant | Where | Shape |
| --- | --- | --- |
| `tower` | The race card, `lg` and up | Four columns of `text-2xl` mono digits separated by colons, unit labels beneath. A lap board. The only place on the site a number is allowed to be this large. |
| `inline` | The line above the headline, below `lg` | The two coarsest non-zero units — `2d 14h`, then `14h 06m`, then `06m 22s`. It settles once a minute instead of ticking under a headline. |

Both are `tabular-nums`, both are unanimated, and both render a same-width
placeholder before mount — the server has no clock that agrees with the
client's, and the shape has to survive hydration without moving a pixel.

**One number, two places, never both.** The clock used to live in a glass chip
floating above the headline, which was a box doing an eyebrow's job (§4.4) and
cost the headline a third of the hero.

### 6.3.2 The marker

`<CircuitTrace interactive>`, and only in the race card. A red dot with a soft
halo follows the pointer **along the track**: it projects onto the nearest
point of the lap rather than sitting under the cursor, so it can only ever be
*on* the circuit. Move the mouse across the infield and it slides round the
outside; leave the drawing and it fades out in 150ms.

It is the site's one piece of direct manipulation that produces no result —
and it is allowed because it is not decoration pretending to be interaction:
it answers a question the drawing invites ("where is that bit of the track?")
and it answers it exactly.

Four rules keep it from costing anything:

- **Mouse only.** `pointerType !== "mouse"` returns immediately. A finger has
  no hover, and the marker would land under whatever was just tapped. This is
  also why it exists only in the card, which is `hidden` below `lg`.
- **Sampled on first hover, not on mount.** Below `lg` the card is
  `display: none`, and path geometry read from an unrendered element is not
  something to rely on. By the time a pointer is over it, it is rendered.
- **800 samples, one pass, no `getPointAtLength` during the move.** At that
  density the nearest sample is already sub-pixel at any size the trace is
  drawn, so a pointer event costs one loop of arithmetic.
- **Written straight onto the element.** No React state: state here would
  re-render the hero on every pointer event, and there is nothing to
  reconcile.

`aria-hidden`, and nothing depends on it. Keyboard users lose nothing because
there is nothing to lose.

### 6.4 Line work

`.hero-grid` (72px cells, radial mask), `.cover-grid` (34px cells, linear
bottom fade), `.checker-edge` (10px squares, two rows, masked at both ends),
`.checker-rule` (6px squares, one row, 50% white, masked at both ends). All are
`pointer-events: none` decoration drawn with gradients — no images.

**Two cuts of the same flag, and they must not be confused.** `.checker-edge`
runs the full width above the footer: it is the end of the *site*.
`.checker-rule` sits inside the top edge of the home page's last-race card: it
is the end of a *race*. The second one exists at half the height, half the
rows, dimmer whites and no edge highlight precisely so the first one keeps its
weight — and it is a card's own edge rather than a band across a section, which
§1.4 forbids.

---

### 6.5 `.grain` — the tooth

```css
.grain {
  position: fixed; inset: 0; z-index: 200;
  pointer-events: none;
  opacity: 0.032;
  background-image: url("data:image/svg+xml,…feTurbulence…");
  background-size: 180px 180px;
}
```

One fixed layer of monochrome noise over the whole site, at 3.2%, mounted once
in `app/layout.tsx`.

Absolutely flat colour is what makes a generated page look *rendered* rather
than *made*: real surfaces have a tooth. The noise is an inline `feTurbulence`
— no image file, no request, nothing on the wire beyond the rule — tiled at
180px, and `feColorMatrix type="saturate" values="0"` desaturates it so it adds
texture and not a colour cast.

It deliberately sits above everything, sheets and the boot screen included: a
texture that stops at the edge of an overlay announces itself. `pointer-events:
none` means it never intercepts anything.

If the phone paint budget (§10.3) ever suffers, this is the first layer to go
behind a `@media (min-width: 768px)`. It has not needed to.

---

## 7. Components

### 7.1 Navigation

**Desktop (`md:` and up).** A floating `.glass-chip` bar, `rounded-panel`,
`mt-4`, in the default 64rem container, `position: fixed`. Active section is
`font-medium text-ink` plus a 2px red underline pinned `-bottom-2`; inactive is
`text-ink-dim` hovering to `text-ink`. `aria-current="page"` on the active link.

**Phone (`< md`).** A hamburger opens a full-screen `bg-bg` overlay, portalled
to `<body>`, with links centred at `text-3xl font-semibold` and a per-item stagger
(§8.3). Opening the menu prefetches every destination; body scroll is locked
while it is open.

`lib/nav.ts` is the single source of both, including `activeHref()`'s
most-specific-match rule. Never hardcode a nav link in a component.

**The profile chip.** Signed in, the right of the bar carries a `glass-chip`
holding a bust glyph and the username, then a *Sign out* chip. The glyph is the
house icon idiom (§9) — inline, `size-4`, `strokeWidth 1.5`, `currentColor` —
and because it inherits, the chip reddens as one thing on hover:
`hover:text-race hover:border-line-hi`. A name on its own read as a label; a
name behind a figure reads as the way back to your own page.

### 7.2 Buttons

Three variants and one shared behaviour. Everything clickable gets
`.pressable` (§8.2).

| Variant | Classes | Use |
| --- | --- | --- |
| **Primary** | `pressable btn-race px-8 py-3.5 text-base font-semibold` | One per view. `px-6 py-3 text-sm` at inline size, `px-4 py-1.5` in the nav. |
| **Secondary** | `pressable glass-chip rounded-control px-8 py-3.5 text-base font-semibold text-ink transition-colors hover:border-line-hi` | Beside a primary. |
| **Tertiary / full-width** | `pressable w-full rounded-control border border-line-hi py-3 text-sm font-semibold transition-colors hover:bg-glass-strong` | Sheet and form actions on a phone. |

**`.btn-race` is the primary action, and it lives in `globals.css`.** Fill,
glow, hover and radius are in the class; size, layout and `disabled:opacity-*`
stay utilities at the call site, because those genuinely differ. Twenty-two
call sites used to carry the same four tokens by hand, which meant every change
to the loudest surface on the site was twenty-two edits — and the glow had
already drifted into three different values.

```css
.btn-race          { background: var(--color-race-deep); box-shadow: var(--shadow-race); … }
.btn-race:hover    { background: var(--color-race); }
.btn-race:disabled { box-shadow: none; }   /* and no hover brightening */
```

A button that starts work renders `<Spinner />` in place of, or beside, its
label until the work returns (§1.3). A destructive action is a tertiary button
in `text-race`, never a filled red one — filled red is the primary action.

### 7.3 Chips and badges

- **Pill badge:** `rounded-full bg-race/15 px-2 py-0.5 font-mono text-[0.65rem] text-race` — the `YOU` marker on a board. One of the two places the capsule survives (§5.4).
- **Chip:** `glass-chip rounded-control px-3 py-1.5 text-xs` — a jump link, a filter, a status. Reads as a tab on an instrument rather than as a small pill.
- **Tint fills** run `bg-race/5` (a selected row) → `/10` (a quiet badge) → `/15` (a loud one). Those three steps only.
- **Toggle button:** `border-race bg-race text-white` when on, `border-line bg-glass text-ink-dim` when off, `aria-pressed` carrying the state. Used by the position picker in §12.2.

### 7.4 Form fields

One shared base, `FIELD` in `components/PlayerDetailsFields.tsx`:

```
min-w-0 rounded-xl border border-line bg-black/25 px-4 py-3 text-sm
outline-none transition-colors placeholder:text-ink-mute focus:border-line-hi
```

The field is *darker* than the card it sits on (`bg-black/25`), which is what
reads as "input" in a dark UI. Width is always the caller's — a `w-full` in the
base beats a sibling's `w-28` in the generated CSS and collapsed a select to
zero width once.

`outline-none` here is safe because the global `:focus-visible` ring is
unlayered (§11.1).

- **Error:** `text-xs text-race` or `text-sm text-race` directly under the field. Never a red border alone.
- **Hint:** `text-xs text-ink-mute`, in a `min-h-[1.25rem]` slot so the layout does not jump when an error replaces it.

### 7.5 Tables and their phone twins

Above `sm:`, a table lives in a `.glass-card` with `p-2`,
`border-separate border-spacing-0`, a `min-w-[Nrem]` and `overflow-x-auto`.
Header row: `text-left font-mono text-xs tracking-wider text-ink-mute uppercase`,
cells `px-3 py-2`.

Below `sm:`, the same data is a `<ul className="flex flex-col gap-1.5 sm:hidden">`
of `rounded-xl border border-line bg-glass px-3 py-2.5` rows — or something
better suited to the shape of the data (§12.2). Both halves live in the same
component so they cannot drift.

The current pairs: `RaceBreakdown` and the standings board. `ProbabilityGrid`
used to be the third and no longer is — see §1.5 and §12.2.

### 7.6 Driver row

The repeated atom of the whole game. Left to right:

1. `h-7 w-1 rounded-full` constructor-colour stripe,
2. `DriverAvatar` — a circular WebP portrait, size passed in (26–36px), falling back to the three-letter code on a `tint(color, 0.2)` wash if the image 404s,
3. the name in `text-sm` sans,
4. numbers, mono, right-aligned.

`DriverAvatar` takes `AvatarDriver` — a `driver_id`, a `code`, and whatever is
known about the colour — deliberately narrower than a full roster row so a
component holding a matrix does not have to fake one.

### 7.7 Waiting

| Surface | Component | When |
| --- | --- | --- |
| Inline | `Spinner` | Any busy control. `1em` square, `currentColor`, so it never needs a variant. |
| Whole route | `RaceLoader` | `loading.tsx`. Start-light gantry over a rotating F1 in-joke, changing every 1.8s. |
| First paint of a session | `BootScreen` | An opaque `#0a0b10` screen, in the server HTML, running the gantry on CSS alone. Lifts on `load`, held for 700ms minimum and 2500ms maximum, once per session (`sessionStorage`). |

The loader phrases are original and name no real driver or team, so they neither
date nor need clearing.

### 7.8 Empty states

`rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute`
with one sentence that says what would fill it. Never an illustration, never a
call to action inside the box.

### 7.9 Links, and the one arrow

`components/Arrow.tsx`. Six links used to end their own label with a literal
`→`: *"See the full race →"*, *"Make your picks →"*. A glyph glued to the end of
a sentence is a writing tic — the link is already a link — and it sits on the
text baseline, so it cannot move.

The mark is an element now, which means it can:

```tsx
<Link href="…" className="group flex items-center gap-2 …">
  <span className="group-hover:underline">See the full race</span>
  <Arrow />
</Link>
```

`group` on the link, `group-hover:translate-x-0.5` inside the arrow. Two signs
survive as glyphs, and only these two: **`↗`**, which means *leaving the site*
(§9), and pagination's **`← Previous` / `Next →`**, where the arrow is the
direction rather than an ornament on a label.

### 7.10 Disclosure — the FAQ row

Native `<details>`, never a JavaScript accordion: it opens before hydration and
find-in-page can reach the answers. `group` on the `<details>`, a hairline
`border-t`, and a mono `+` at the right that rotates 45° on `group-open`.

**The question is a control, so it carries the control colour.** The summary is
`hover:text-race group-open:text-race`, and the `+` follows on both. Open and
shut therefore differ in two channels — the mark turns *and* lights (§1.2) —
and a question you are pointing at answers back before you click it.

One scoping rule: the marker's hover is `group-hover/q:` on the **summary**, not
the `<details>` group. The group's box grows to contain the answer once it is
open, so a `group-hover:` marker would light while you were merely reading —
a hover state pointing at nothing.

---

## 8. Motion

### 8.1 Easing and duration

Two easings, both tokens: `--ease-out-strong` (`cubic-bezier(0.23, 1, 0.32, 1)`)
for anything entering or responding, `--ease-in-out-strong` for anything
symmetric. Durations cluster in three bands:

- **160–240ms** — response to a touch: press, menu fade, sheet rise.
- **300–340ms** — a change of state: item stagger, loader phrase, boot fade.
- **620–640ms** — an entrance, first view only.

Colour changes are `transition-colors` with Tailwind's default 150ms and are
not tokenised.

### 8.2 `.pressable`

```css
.pressable { transition: transform 160ms var(--ease-out-strong); }
.pressable:active { transform: scale(0.97); }
```

On every clickable thing — 71 uses. It is the site's only universal
interaction feedback and it is what makes the phone feel native. Add it to
anything new that is tappable.

### 8.3 Entrances

`.rise-in` (14px up, 640ms) with `.rise-in-2`…`.rise-in-5` adding 70ms each.
**First view only, and rare** — all six uses on the site are in the home hero.
Never animate content that appears on every navigation.

The mobile menu has its own version: `.menu-in` fades the overlay in 170ms,
`.menu-item` staggers the links.

### 8.4 Reduced motion

`@media (prefers-reduced-motion: reduce)` is handled per effect, not globally:

- the spinner slows to 1.6s rather than stopping (a frozen spinner reads as a hang),
- the start lights hold lit at `opacity: 0.8` — still a gantry, just not running,
- `.rise-in` becomes a fade with no transform,
- menu items and the sheet appear with no animation at all.

Any new animation adds its own branch here.

---

## 9. Imagery and icons

**There is no icon library.** The handful of icons are inline `<svg>` with
`fill="none" stroke="currentColor" strokeWidth="1.5"` and round caps, sized with
`size-4`/`size-5`, always `aria-hidden`. Typographic glyphs do the rest: `×` for
close, `↗` for an external link, `?` in a disc for "why".

**Driver portraits** live at `web/public/drivers/{driver_id}.webp` — 22 files,
~24 kB each. WebP is not optional: the same portraits as PNG-24 were ~210 kB
each, and the pick screen renders all twenty-two, so it was pulling 4.6 MB.
`lib/format.ts#driverPhoto` is the only place the path is built.

Portraits are `loading="lazy" decoding="async"` and every use has an `onError`
fallback to the driver's code on a tinted disc.

**There are no other images — including the product shot.**
`components/PickBoardShot.tsx` is the only picture of the product on the home
page and it is not a picture: it is the pick board's own markup, server-rendered
from the real roster, in a top 10 that really happened (the last Grand Prix's
finishing order, borrowed from `loadLastRace()` — the same request-cached call
the proof section below already pays for). No browser chrome, no phone bezel:
both are the clichés that come immediately after "put a screenshot on it". The
board simply runs past its column and dissolves (`.shot-fade-x` /
`.shot-fade-y`, two nested masks rather than `mask-composite`, which still wants
a prefixed keyword in Safari).

Two rules keep it honest. It is caught **mid-task** — five slots filled, the
sixth open and lit — because a finished board says nothing about what you would
do with it; the count is tuned to the crop, not chosen for its own sake. And the
whole replica is `aria-hidden` with one `sr-only` sentence standing in for it,
because it has slot numbers, a grip on every row and an open field, none of
which do anything: announcing ten fake controls would be a lie with ten rows in
it.

Before the first race of a season there is no order to borrow and the board
renders empty. That is not a fallback — it is exactly what the screen looks like
in March.

No stock photography, no illustration, no icon sprites. The grids, the checkered
edge and the glows are CSS; the circuit trace (§6.3) is an inline `<path>`
generated from telemetry, not an asset anyone drew.

---

## 10. Responsive behaviour

### 10.1 Breakpoints

Tailwind's defaults, used with intent:

| Breakpoint | Width | What changes |
| --- | --- | --- |
| `sm:` | 640px | Data density. Tables replace their phone twins; a name replaces a code. |
| `md:` | 768px | Navigation. Hamburger → inline links, profile and sign-out appear. |
| `lg:` | 1024px | Interaction model. The prediction editor switches from a bottom sheet to a two-column drag-and-drop board. |

`xl:` appears once, on a card grid, and carries no meaning of its own. Design
mobile-up: the phone case is the one written first.

### 10.2 Phone rules

1. **Never a sideways scroll.** See §1.5. If content does not fit, change the cut.
2. **Sheets, not modals.** A phone picker is a bottom sheet (`.sheet-panel`, rising 14% in 240ms) over a fading backdrop, portalled to `<body>`.
3. **Touch targets ≥ 40px.** Rows are `py-2` around a 26–32px element; standalone controls are `h-10`/`size-10`.
4. **Haptics where offered.** `navigator.vibrate?.(8)` on a successful drag pickup — a single 8ms tick, Android only, never for anything else.
5. **`touch-manipulation` and `[-webkit-touch-callout:none]`** on anything draggable, or iOS raises the text-selection callout mid-drag.

### 10.3 Paint budget

Phone GPUs choke on large blurred layers and wide shadows — they land late, as
a flat dark rectangle that only resolves on the next paint. Under `767px`,
`globals.css` therefore cuts the card shadow to `0 10px 24px rgb(0 0 0 / 0.38)`
and shrinks the aurora to roughly half its size at `48px` blur. Same look, a
fraction of the cost. A new large blur or wide shadow needs a matching entry in
that block.

---

## 11. Accessibility

### 11.1 Focus

One ring, on everything, keyboard only:

```css
:focus-visible {
  outline: 2px solid var(--color-race);
  outline-offset: 2px;
}
```

Two details are deliberate. It is **unlayered** — Tailwind's utilities sit in a
cascade layer and unlayered rules beat layered ones at any specificity, so this
covers the elements carrying `outline-none` without hunting them down, and
covers anything added later for free. And it is `:focus-visible`, not `:focus`,
so a mouse click leaves no ring behind — which is why the outlines were removed
in the first place. No `border-radius`: an outline follows the element's own.

### 11.2 Rules

- **Colour is never the only channel** (§1.2). Every chart cell, bar and badge prints its value.
- **Real semantics.** Tables are `<table>` with `<caption>`, `scope="col"`, `scope="row"`. Charts are `<figure>`/`<figcaption>`. Lists of ranked things are `<ol>`.
- **Half an ARIA pattern is worse than none.** Toggle buttons use `aria-pressed` rather than borrowing `role="tab"` without the `aria-controls` and tabpanel the tab pattern owes the reader.
- **`sr-only` carries what colour implies** — `{name}, P{c}, {pct}` inside a heat-map cell, `Loading…` beside a gantry.
- **Live regions** on anything that changes without a click: `role="status" aria-live="polite"` on the loaders.
- **Decoration is `aria-hidden`** — stripes, bars, glyph icons, the gantry itself.
- **Contrast is measured, not assumed.** §3.4 records the numbers for the one place it was close.

---

## 12. Data visualisation

The site ships **no charting library**. Every chart is hand-drawn SVG, CSS, or
canvas, because each one is a few dozen lines and a dependency would be larger
than all of them together.

### 12.1 `PointsCurve` — the season

Two polylines in a `100 × 40` user-unit SVG with `preserveAspectRatio="none"`,
so it stretches to any width; `vector-effect="non-scaling-stroke"` keeps the
strokes an honest 1px through that stretch. Your line is your season-pick
colour, the model's is race red. Below two scored races it renders nothing at
all — one point is a dot, not a curve.

### 12.2 `ProbabilityGrid` — the matrix, one position at a time

The model's Monte-Carlo output: for each driver, P(finishing in exactly this
position), frozen at lock time. It is the same number the rarity multiplier is
read from, which is why its colour bands are the multiplier tiers (§3.4, §1.1).

**One chart, at every width.** Ten position toggles and, beside them, the
drivers ranked by how often they finished *there*:

- the `P1…P10` toggles are a **5×2 pad** below `sm:` and a **vertical rail** from `sm:` up — every position on screen at once at both, because a ten-chip rail that scrolled sideways was never an option (§10.2). Toggle buttons with `aria-pressed`, not `role="tablist"`: the tab pattern owes the reader an `aria-controls` and a real tabpanel, and half a pattern announces worse than none;
- a sentence naming what is being read and who the model actually played there;
- one row per driver: the constructor stripe, the portrait and the name sitting *inside* a bar whose fill is the band colour, with the percentage and multiplier in a reserved right-hand gutter;
- a tail line counting whoever fell under 1%.

Four details are load-bearing. Bars are scaled against **the leader of that
position**, not against 100%, or a flat field draws ten stubs — the printed
percentage is the absolute value and remains the primary channel. The fill
stops short of the numbers, because the multiplier is drawn in race red and
vanished completely on a full-strength red bar. Names are full-strength ink on
every row: the name is the identity, and a 1% driver still has to be legible.
And from `sm:` up the rail carries `self-start`, because a grid item stretched
to the height of an eighteen-row list stretches its own rows with it, and ten
fixed-height buttons ended up spaced across six hundred pixels by gaps that
meant nothing.

**What was deleted, and why it is worth remembering.** Above `sm:` this used to
be a twenty-by-ten heat map — a real `<table>`, two hundred cells, the whole
matrix at once. It is an impressive object and a poor read: answering "who does
the model think finishes third, and what does calling it pay?" meant finding a
column, scanning it against four tints, and then looking the tint up in a
legend below. The list answers it sorted, in one glance, with the number and
the multiplier printed on every row — and it is the shape of the thing the
player is about to do, which is fill P1…P10 with names.

The five-swatch legend went with it. Every row prints its own multiplier beside
its own bar, so the same five tiers spelled out underneath is a key to a chart
that does not need one. The interpretive sentence stays (§12.4, rule 5).

### 12.3 `ScoringScale` — the barème

Four numbers — `10 pts / ×3 / +15 / +100` — that used to sit in a `glass-card`
as four equal centred columns. The stat row is the second most generic block a
landing page can carry, and here it was also *wrong*: those are not four
statistics, they are the four rungs of a scale, and setting them at equal weight
erased the only thing worth knowing — a perfect top 10 is worth ten times an
exact call.

So the rule is drawn as the rule (§1.1). One `<dl>`, one row per rung, a
hairline between: the label and its one-line gloss on the left, the number on
the right, and between them a **1.5px bar whose width is the number** — 10%,
15%, 100% of the same track. No axis, no gridlines, no card. Bars are
square-ended (§5.4) and every value is printed beside its length (§1.2), so the
bar is never the only channel.

`×3` is the one that cannot be plotted, because a multiplier is not a quantity
of points. It is drawn as what it actually *does*: the ten-point bar, continued
in a hollow `bg-race/25` up to thirty. Putting it on the axis as a fourth
independent value would have been a category error dressed as a chart.

On a phone the track drops to its own line under the label/value pair rather
than being squeezed into forty pixels — a tenth of forty pixels is four, and
four pixels is not a quantity.

### 12.4 Rules for a new chart

1. One hue, sequential, low→high. Never a rainbow, never a diverging scale unless the data actually diverges.
2. If the scale encodes a game rule, use the rule's own thresholds.
3. Print the value next to the colour.
4. `<figure>` + `<figcaption>`; the caption carries the interpretation, not a restatement of the title.
5. Say what the pale end means. On this site the pale end is where the points are, and that sentence appears under the chart.

---

## 13. Voice and content

### 13.1 Tone

Second person, present tense, short sentences. Confident and specific —
"Ten thousand simulated races, reduced to one number per driver per position" —
never breathless. Dry humour is allowed in exactly one place: the loading
phrases. Nowhere else.

Headlines are declarative and can be fragments: *Beat the model. Every single
Sunday.* Body copy explains the mechanic and then stops.

### 13.2 Capitalisation

Sentence case everywhere — headings, buttons, nav, labels. The only uppercase
is the mono micro-label, where it is a typographic device rather than a
capitalisation rule. `F1 DUEL` is a logotype, not a heading.

### 13.3 Numbers

Formatting lives in `lib/format.ts` and nowhere else:

- `formatPoints` — integers bare, otherwise one decimal.
- `formatMargin` — **always signed**, because the sign is the whole point of the column, and the minus is U+2212 (`−`) so it lines up with the digits in a tabular column. Never a hyphen.
- `pos(n)` → `P4`. Positions are always written this way, never "4th".
- Probabilities are whole percentages. Multipliers are `×1.5`, with the multiplication sign, never `x1.5`.

### 13.4 Domain language

"Grand Prix" not "race" in prose (a *round* is the numbered one). "The model",
lower case, always definite — it is a character in the game. "Lock" is when
predictions close. "Duel" is one player against the model for one Grand Prix.

### 13.5 Footer disclaimer

The site is an unofficial fan project and says so on every page, in
`text-xs text-ink-mute` above the fold of the footer, along with data
attribution to FastF1 and Jolpica. Do not remove or shrink it.

---

## 14. Off-site surfaces

Three places the design has to survive outside a browser tab.

### 14.1 Open Graph cards

`app/opengraph-image.tsx` and the per-route ones under `join/[code]` and
`profile/[username]`, drawn with `next/og` and sharing `lib/og.tsx`. Same
palette, same logotype. `metadataBase` is absolute and read from the
environment: a share card is fetched by WhatsApp or Slack, not by the browser on
the page, so a relative base silently yields a card with no image.

### 14.2 The race poster

`lib/poster/draw.ts` — a 1080×1350 sheet drawn by hand on a canvas at 2× and
downscaled, so it is identical on every device and the same drawing feeds the
PDF writer. Deliberately not an html-to-image screenshot, which renders whatever
the browser supports that day.

It restates the site's language in canvas terms: the dark base, a red glow over
a faint grid, glass rows, the checkered finish line, emerald for exact and amber
for near. Its palette is a literal copy of the tokens in §3.1 — **if a token
changes, change `C` in `draw.ts` in the same commit.**

### 14.3 Installed app

`app/manifest.ts` and `viewport.themeColor = "#0a0b10"`, so the phone's browser
chrome paints itself in the page colour and the address bar continues the page
instead of ending it in a light grey band.

---

## 15. Keeping this document true

This file is a description, not a proposal. It is wrong the moment the code
disagrees with it, so:

1. **A change to any of these updates this file in the same PR:** the `@theme`
   block, `.glass-card`/`.glass-chip`, `.display`, `.hero-outline`,
   `.btn-race`, `.grain`, `CircuitTrace.tsx`, `PickBoardShot.tsx`,
   `ScoringScale.tsx`, `Arrow.tsx`, `Wordmark.tsx`, the focus ring, `.pressable`, the probability bands, the
   container widths, the breakpoint meanings, the button variants, the poster
   palette, or `lib/format.ts`'s number rules.
2. **New patterns get a home here or they get deleted.** A one-off card style, a
   fourth button variant or a second spinner is either promoted into this
   document with a reason, or removed.
3. **Record what lost.** The most useful lines in this file are the ones saying
   what was tried and why it was reverted — the section band, the 90px blur, the
   14rem hero fade, the alpha-suffixed hex, the phone heat map, the aurora, the
   gradient headline, the seventy-six capsules, the three equal numbered cards,
   the centred stat row, the red bullet discs, the arrows glued to labels, the
   two-hundred-cell heat map.
   Keep adding them; they are what stops a fix from being re-broken.
4. Design decisions that are *game* decisions belong in
   [`GAME_DESIGN.md`](GAME_DESIGN.md); this file only says how they are drawn.

---

## 16. Appendix — token reference

Everything a new component needs, in one place. All of it is already a Tailwind
utility.

```
Surface     bg-bg                #0a0b10        the page, nothing else
            glass-card                          cards
            glass-chip                          floating / secondary
            bg-glass             white 4.5%     inert rows
            bg-glass-strong      white 7%       hover, "this is you"
            bg-black/25                         form fields

Ink         text-ink             #f4f6fa        primary
            text-ink-dim         #a7adba        body
            text-ink-mute        #6c7280        labels, empty, disabled

Accent      text-race / bg-race  #ff1e3c        signal: active, errors, data, hover
            bg-race-deep         #c8102e        surface: any resting red fill
            btn-race                            the primary button, whole
            bg-race/5 /10 /15                   tint steps, only these three

Line        border-line          white 10%      default
            border-line-hi       white 16%      hover / emphasis

Semantic    text-emerald-400                    exact, positive, won
            text-amber-300                      near, draw, caution
            text-race                           error, lost
            text-ink-mute                       missed, none

Type        font-sans (Archivo)                 prose, buttons, names
            .display (Archivo wdth 118)         headlines, wordmark, nav
            .hero-outline                       the hero's second line, once
            font-mono (Geist Mono)              every number and label
            tabular-nums                        anything that ticks

Radius      rounded-control      5px           buttons, fields, chips, rows
            rounded-panel        10px          cards, nav, sheets, panels
            rounded-full                        badges, dots, actual circles
            (nothing)                           bars and stripes

Shadow      --shadow-panel                      glass-card, desktop
            --shadow-panel-sm                   glass-card, phone
            --shadow-race                       under btn-race, nowhere else

Texture     .grain                              mounted once in layout.tsx

Motion      --ease-out-strong    cubic-bezier(0.23, 1, 0.32, 1)
            --ease-in-out-strong cubic-bezier(0.77, 0, 0.175, 1)
            .pressable                          every clickable thing
            .rise-in(-2…-5)                     first-view entrances only

Layout      w-[min(64rem,calc(100%-2rem))]      default container
            w-[min(48rem,calc(100%-2rem))]      long-form
            w-[min(28rem,calc(100%-2rem))]      single form
            pt-28                               clears the fixed nav
```

**Where things live**

| File | Owns |
| --- | --- |
| `web/app/globals.css` | Tokens, all shared classes, all keyframes, the reduced-motion and mobile-paint blocks. |
| `web/app/layout.tsx` | Fonts, metadata defaults, theme colour, the body frame. |
| `web/lib/teams.ts` | Constructor colours, `tint`, `NEUTRAL_COLOR`. |
| `web/lib/format.ts` | Every number, name and asset-path format. |
| `web/lib/nav.ts` | The navigation, desktop and phone. |
| `web/lib/poster/draw.ts` | The off-site palette copy. |
| `web/components/Spinner.tsx`, `RaceLoader.tsx`, `BootScreen.tsx` | Waiting. |
| `web/components/ProbabilityGrid.tsx` | The probability bands and the one reading of the matrix. |
| `web/components/Wordmark.tsx` | The site's name, every appearance of it. |
| `web/components/CircuitTrace.tsx` | One circuit, drawn, and the hover marker. Client, for the pointer. |
| `web/components/HeroRaceCard.tsx` | The hero's right column from `lg`: trace, facts, clock. |
| `web/components/HeroTraceBleed.tsx` | The same circuit as a masked corner bleed, below `lg`. |
| `web/components/NextRaceLine.tsx` | The hero's eyebrow, and the phone's clock. |
| `web/lib/circuits.ts` | **Generated.** Circuit geometry — rebuild with `jobs/build_circuit_traces.py`, never edit. |
