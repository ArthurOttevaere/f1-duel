"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Arrow from "@/components/Arrow";
import ProfileAvatar from "@/components/ProfileAvatar";
import {
  driverPhoto,
  formatMargin,
  formatPoints,
  multiplierLabel,
} from "@/lib/format";
import type { Recap } from "@/lib/recap";
import { tint } from "@/lib/teams";

/**
 * The season recap, told as a story: one screen a chapter, moved through by
 * hand (`docs/GAME_DESIGN.md` §2.3, DESIGN §7.19).
 *
 * It is the one surface on the site that is paged rather than scrolled, and
 * the reason is what it holds — eight or nine facts of equal standing, each of
 * which wants the whole screen for a moment and none of which is reference
 * material. A page would have ranked them by how far down they were.
 *
 * Three things it deliberately is not:
 *
 * - **It does not play itself.** No timer, no auto-advance. A slide that
 *   leaves while you are reading it is the format's worst habit, and it is the
 *   one thing here that reduced-motion users could not have switched off.
 * - **It does not hide the count.** The rail on top is the pick board's
 *   progress rail — square-ended ticks, red when passed — so a reader always
 *   knows how much is left.
 * - **It is not a carousel.** There is no swipe physics to get wrong on
 *   Safari: a tap on the right two thirds goes on, the left third goes back,
 *   the arrow keys do the same, and two real buttons sit under the stage for
 *   anyone who wants to be sure.
 */

interface Slide {
  /** Stable key; also what the live region announces. */
  id: string;
  eyebrow: string;
  body: React.ReactNode;
}

/** A value in a column — the site's spec sheet (§7.11), two or three rows. */
function Sheet({ rows }: { rows: [label: string, value: React.ReactNode][] }) {
  return (
    <dl className="mt-auto border-b border-line">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-baseline justify-between gap-6 border-t border-line py-3"
        >
          <dt className="font-mono text-[0.6rem] tracking-[0.16em] text-ink-mute uppercase">
            {label}
          </dt>
          <dd className="text-right font-mono text-sm text-ink tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The one oversized figure a chapter stands on — car-number style (§5.5). */
function Figure({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`font-mono text-7xl leading-none font-semibold tracking-tight tabular-nums sm:text-8xl ${className}`}
    >
      {children}
    </p>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="display mt-5 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
      {children}
    </h2>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-ink-dim">{children}</p>
  );
}

const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

const percent = (p: number) =>
  p < 0.01 ? "under 1%" : `${Math.round(p * 100)}%`;

function Hit({ hit }: { hit: boolean | null }) {
  if (hit === null) return null;
  return hit ? (
    <span className="text-emerald-400">✓</span>
  ) : (
    <span className="text-ink-mute">✗</span>
  );
}

function buildSlides(r: Recap, share: React.ReactNode): Slide[] {
  const slides: Slide[] = [];
  const gp = (n: number) => (n === 1 ? "Grand Prix" : "Grands Prix");

  // ── Cover ──
  slides.push({
    id: "cover",
    eyebrow: `Season ${r.season} · the recap`,
    body: (
      <>
        <div className="mt-6">
          <ProfileAvatar
            driverId={r.avatarDriver}
            username={r.username}
            color={r.paint}
            size={112}
          />
        </div>
        <h1 className="display mt-8 text-4xl leading-none font-extrabold tracking-tight break-words sm:text-5xl">
          {r.username}
        </h1>
        <Headline>
          {r.duels} {gp(r.duels)} against the model.
        </Headline>
        <Note>
          Every call you made this year, against what actually happened. It
          takes a minute.
        </Note>
      </>
    ),
  });

  // ── The record ──
  slides.push({
    id: "record",
    eyebrow: "The record",
    body: (
      <>
        <Figure className="mt-6">
          <span className="text-emerald-400">{r.won}</span>
          <span className="text-ink-mute">–</span>
          <span className="text-amber-300">{r.drawn}</span>
          <span className="text-ink-mute">–</span>
          <span className="text-race">{r.lost}</span>
        </Figure>
        <Headline>
          {r.won > r.lost
            ? "You finished the year ahead of the machine."
            : r.won === r.lost
              ? "You and the machine finished level."
              : "The machine took the year. This time."}
        </Headline>
        <Note>
          Won, drawn, lost — over {r.duels} of the season&apos;s{" "}
          {r.seasonRaces} {gp(r.seasonRaces)}.
        </Note>
        <Sheet
          rows={[
            ...(r.rank
              ? ([["Final position", `P${r.rank} of ${r.field}`]] as [
                  string,
                  React.ReactNode,
                ][])
              : []),
            ["Margin on the model", formatMargin(r.margin)],
            ["Average a race", formatPoints(r.average)],
          ]}
        />
      </>
    ),
  });

  // ── Best weekend ──
  slides.push({
    id: "best",
    eyebrow: "Your best Sunday",
    body: (
      <>
        <Figure className="mt-6">{formatPoints(r.best.points)}</Figure>
        <Headline>The {r.best.name}.</Headline>
        <Note>
          {r.best.margin > 0
            ? "Nothing else you did all year scored like it — and the model was nowhere near."
            : "Your highest score of the year, on a day the model was good too."}
        </Note>
        <Sheet
          rows={[
            ["Round", String(r.best.round).padStart(2, "0")],
            ["The model", formatPoints(r.best.model)],
            ["Margin", formatMargin(r.best.margin)],
          ]}
        />
      </>
    ),
  });

  // ── The defeat, or the lack of one ──
  if (r.worst) {
    slides.push({
      id: "worst",
      eyebrow: "The one that got away",
      body: (
        <>
          <Figure className="mt-6 text-race">
            {formatMargin(r.worst.margin)}
          </Figure>
          <Headline>The {r.worst.name}.</Headline>
          <Note>
            {r.lost === 1
              ? "The only Sunday the model had you all year."
              : `The heaviest of your ${r.lost} defeats. It happens to everybody; the model does not gloat.`}
          </Note>
          <Sheet
            rows={[
              ["Round", String(r.worst.round).padStart(2, "0")],
              ["You", formatPoints(r.worst.points)],
              ["The model", formatPoints(r.worst.model)],
            ]}
          />
        </>
      ),
    });
  } else if (r.drawn === 0) {
    slides.push({
      id: "unbeaten",
      eyebrow: "Unbeaten",
      body: (
        <>
          <Figure className="mt-6 text-emerald-400">{r.duels}/{r.duels}</Figure>
          <Headline>The model never beat you. Not once.</Headline>
          <Note>
            Ten thousand simulated races a weekend, and it still did not find
            one Sunday to take off you.
          </Note>
        </>
      ),
    });
  }

  // ── Boldest call ──
  if (r.boldest) {
    const b = r.boldest;
    slides.push({
      id: "boldest",
      eyebrow: "Your boldest call",
      body: (
        <>
          <Figure className="mt-6">
            {multiplierLabel(b.multiplier) || `+${formatPoints(b.points)}`}
          </Figure>
          <Headline>
            {b.driverName}, P{b.position}, at the {b.raceName}.
          </Headline>
          <Note>
            {b.probability !== null && b.multiplier > 1 ? (
              <>
                The model gave that {percent(b.probability)}. You called it
                anyway, and it came in on the nose.
              </>
            ) : (
              <>On the nose — the exact position, called before the lights.</>
            )}
          </Note>
          <Sheet
            rows={[
              ["Worth", `${formatPoints(b.points)} pts`],
              ["Exact positions, all year", `${r.exactHits} of ${r.calls}`],
            ]}
          />
        </>
      ),
    });
  }

  // ── The banker ──
  if (r.banker) {
    const k = r.banker;
    slides.push({
      id: "banker",
      eyebrow: "Your banker",
      body: (
        <>
          <div className="mt-6 flex items-end gap-5">
            <span
              className="flex size-24 shrink-0 items-end justify-center overflow-hidden rounded-full sm:size-28"
              style={{
                background: `linear-gradient(180deg, ${tint(k.color, 0.36)}, ${tint(k.color, 0.1)})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local asset, tiny */}
              <img
                src={driverPhoto(k.driverId)}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </span>
            <Figure>{formatPoints(k.points)}</Figure>
          </div>
          <Headline>Nobody paid you like {k.name}.</Headline>
          <Note>
            More of your points came from that one name than from any other
            driver on the grid.
          </Note>
          <Sheet
            rows={[
              ["In your top 10", `${k.picked} of ${r.duels} duels`],
              ...(r.winnerCalls.made > 0
                ? ([
                    [
                      "Your calls for the win",
                      `${r.winnerCalls.right} right of ${r.winnerCalls.made}`,
                    ],
                  ] as [string, React.ReactNode][])
                : []),
            ]}
          />
        </>
      ),
    });
  }

  // ── Side bets ──
  if (r.dotd.made + r.safetyCar.made > 0) {
    slides.push({
      id: "side",
      eyebrow: "The side bets",
      body: (
        <>
          <Figure className="mt-6">+{formatPoints(r.sidePoints)}</Figure>
          <Headline>
            {r.sidePoints > 0
              ? "The small bets added up."
              : "The small bets stayed small."}
          </Headline>
          <Note>
            Five points for the Driver of the Day, eight for reading the safety
            car — the two calls that have nothing to do with the order.
          </Note>
          <Sheet
            rows={[
              ...(r.dotd.made > 0
                ? ([
                    [
                      "Driver of the Day",
                      `${r.dotd.right} right of ${r.dotd.made}`,
                    ],
                  ] as [string, React.ReactNode][])
                : []),
              ...(r.safetyCar.made > 0
                ? ([
                    [
                      "Safety car",
                      `${r.safetyCar.right} right of ${r.safetyCar.made}`,
                    ],
                  ] as [string, React.ReactNode][])
                : []),
            ]}
          />
        </>
      ),
    });
  }

  // ── The championship call: where the bonus is paid ──
  if (r.call) {
    const c = r.call;
    const paid = c.awarded ?? 0;
    slides.push({
      id: "call",
      eyebrow: "The call",
      body: (
        <>
          <Figure
            className={`mt-6 ${
              c.awarded === null
                ? "text-ink-mute"
                : paid > 0
                  ? "text-emerald-400"
                  : "text-ink-dim"
            }`}
          >
            {c.awarded === null ? "—" : `+${formatPoints(paid)}`}
          </Figure>
          <Headline>
            On {dayMonth(c.lockedAt)} you called {c.driverName} and {c.team}.
          </Headline>
          <Note>
            {c.awarded === null
              ? "Locked for good, win or lose. It is paid once the season is settled."
              : paid > 0
                ? c.driverHit && c.teamHit
                  ? "Both came in. That is the season-long bet, paid here and nowhere else."
                  : "Half of it came in — and half a championship call is still paid."
                : "Neither came in. Locked for good is locked for good."}
          </Note>
          <Sheet
            rows={[
              [
                "Drivers' champion",
                <>
                  {c.championDriver ?? c.driverName} <Hit hit={c.driverHit} />
                </>,
              ],
              [
                "Constructors' champion",
                <>
                  {c.championTeam ?? c.team} <Hit hit={c.teamHit} />
                </>,
              ],
            ]}
          />
        </>
      ),
    });
  }

  // ── The last word ──
  slides.push({
    id: "total",
    eyebrow: `Season ${r.season} · final`,
    body: (
      <>
        <Figure className="mt-6">{formatPoints(r.total)}</Figure>
        <Headline>That&apos;s your {r.season}.</Headline>
        <Note>
          {r.rank
            ? `P${r.rank} of ${r.field} on the table, which counts duels won. The points are yours either way.`
            : "The table counts duels won. The points are yours either way."}
        </Note>
        <Sheet
          rows={[
            ["Race points", formatPoints(r.points)],
            ...(r.call
              ? ([
                  [
                    "Championship call",
                    r.call.awarded === null
                      ? "pending"
                      : `+${formatPoints(r.call.awarded)}`,
                  ],
                ] as [string, React.ReactNode][])
              : []),
          ]}
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {share}
          <Link
            href="/game/standings"
            className="pressable group inline-flex items-center gap-2 rounded-control border border-line-hi px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-glass-strong"
          >
            Final standings
            <Arrow />
          </Link>
        </div>
      </>
    ),
  });

  return slides;
}

/** Share the recap's address: the system sheet where there is one, the clipboard otherwise. */
function ShareButton({ username, season }: { username: string; season: number }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin + window.location.pathname;
    const title = `${username}'s ${season} against the model · F1 Duel`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Dismissing the share sheet rejects the promise. Not an error.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="pressable btn-race rounded-control px-6 py-2.5 text-sm font-semibold"
    >
      <span aria-live="polite">{copied ? "Link copied" : "Share this season"}</span>
    </button>
  );
}

export default function SeasonStory({
  recap,
  preview = false,
}: {
  recap: Recap;
  /** Development only: the season is still running and nothing is paid. */
  preview?: boolean;
}) {
  const slides = useMemo(
    () =>
      buildSlides(
        recap,
        <ShareButton username={recap.username} season={recap.season} />,
      ),
    [recap],
  );
  const [index, setIndex] = useState(0);
  const last = slides.length - 1;
  const stage = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (step: number) =>
      setIndex((i) => Math.min(last, Math.max(0, i + step))),
    [last],
  );

  // Arrow keys, anywhere on the page — the story is the page. Not while a
  // modifier is held (⌘← is "back" in Safari) and not from inside a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // A tap on the stage turns the page — unless it landed on something that
  // already does something (a link, the share button) or the reader is
  // selecting text.
  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    const box = e.currentTarget.getBoundingClientRect();
    go(e.clientX - box.left < box.width / 3 ? -1 : 1);
  }

  const slide = slides[index];

  return (
    <div className="mx-auto flex w-full max-w-[27rem] flex-col">
      <div
        ref={stage}
        onClick={onStageClick}
        role="group"
        aria-roledescription="slide"
        aria-label={`${slide.eyebrow} — ${index + 1} of ${slides.length}`}
        className="glass-card story-stage relative flex cursor-pointer flex-col overflow-hidden select-none"
        style={{
          backgroundImage: `
            radial-gradient(28rem 20rem at 12% -8%, ${tint(recap.paint, 0.34)}, transparent 70%),
            radial-gradient(22rem 16rem at 110% 108%, ${tint(recap.paint, 0.16)}, transparent 72%)
          `,
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${recap.paint}, ${tint(recap.paint, 0.15)} 55%, transparent)`,
          }}
        />

        {/* The pick board's progress rail: how far in, how much left. */}
        <div aria-hidden className="flex gap-1 px-5 pt-5 sm:px-7 sm:pt-6">
          {slides.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 flex-1 transition-colors duration-200 ${
                i <= index ? "bg-race" : "bg-line"
              }`}
            />
          ))}
        </div>

        {/* `key` remounts the chapter so its entrance runs again; the live
            region reads the new one out. */}
        <div
          key={slide.id}
          aria-live="polite"
          className="story-in flex min-h-0 flex-1 flex-col px-5 pt-6 pb-6 sm:px-7 sm:pt-7 sm:pb-7"
        >
          <p className="font-mono text-[0.65rem] tracking-[0.18em] text-race uppercase">
            {slide.eyebrow}
            {preview && (
              <span className="text-ink-mute"> · preview, season running</span>
            )}
          </p>
          {slide.body}
        </div>
      </div>

      {/* Real controls, for anyone who would rather not guess where to tap —
          and the only ones a screen reader is offered. */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="pressable rounded-control border border-line-hi px-4 py-2 text-sm font-semibold transition-colors hover:bg-glass-strong disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ← Previous
        </button>
        <p className="font-mono text-xs text-ink-mute tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === last}
          className="pressable rounded-control border border-line-hi px-4 py-2 text-sm font-semibold transition-colors hover:bg-glass-strong disabled:opacity-30 disabled:hover:bg-transparent"
        >
          Next →
        </button>
      </div>

      <Link
        href={`/profile/${recap.username}`}
        className="group mt-6 inline-flex items-center gap-2 self-center text-sm font-semibold text-ink-dim transition-colors hover:text-ink"
      >
        <span className="group-hover:underline">
          {recap.username}&apos;s profile
        </span>
        <Arrow />
      </Link>
    </div>
  );
}
