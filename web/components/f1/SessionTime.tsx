"use client";

import { useSyncExternalStore } from "react";

/**
 * Session times, in the reader's zone or the circuit's.
 *
 * Every time on the `/f1` pages is printed here, on the client, because the
 * server cannot know where the reader is: it renders in UTC on Vercel, and a
 * Belgian reader was being told a Grand Prix starts at 20:00 when it starts at
 * 21:00. So the server sends the instant, and the browser's own zone
 * (`Intl`) does the rest.
 *
 * The choice between "your time" and "track time" is one value for the whole
 * section, kept in `localStorage` and shared through a tiny external store, so
 * flipping it on one page flips every time on it — and it is still flipped on
 * the next page. Storage can be refused (private mode); the choice then lives
 * for the visit.
 *
 * Before hydration there is no zone to format in. The server prints the UTC
 * string *invisibly* rather than a placeholder of a different length, so the
 * row does not shift when the real value lands.
 */

export type TimeMode = "local" | "track";

const KEY = "f1-time-mode";
let memory: TimeMode = "local";
const listeners = new Set<() => void>();

function read(): TimeMode {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "local" || v === "track") return v;
  } catch {
    // Storage refused: fall through to the in-memory choice.
  }
  return memory;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function setMode(mode: TimeMode) {
  memory = mode;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // Kept in memory for the visit.
  }
  listeners.forEach((l) => l());
}

/** null until hydrated — there is no reader's zone on the server. */
function useMode(): TimeMode | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** The zone to format in: undefined is the browser's own. */
function zoneFor(mode: TimeMode, track: string | null): string | undefined {
  return mode === "track" ? (track ?? "UTC") : undefined;
}

const FORMATS = {
  time: { hour: "2-digit", minute: "2-digit" },
  day: { weekday: "short", day: "numeric", month: "short" },
  dayTime: {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

function format(
  iso: string,
  show: keyof typeof FORMATS,
  timeZone: string | undefined,
): string {
  return new Intl.DateTimeFormat("en-GB", { ...FORMATS[show], timeZone })
    .format(new Date(iso))
    .replace(",", "");
}

/**
 * One instant, as a day, a time, or both.
 *
 * `after` is the previous row's instant: a day that repeats it is left blank,
 * so a schedule reads as days with sessions under them. Which sessions share
 * a day depends on the zone — Las Vegas runs Saturday night locally and
 * Sunday morning in Europe — so the grouping can only be decided here.
 */
export function When({
  iso,
  zone,
  show,
  after,
  className = "",
}: {
  iso: string;
  /** The circuit's zone, for track time. */
  zone: string | null;
  show: keyof typeof FORMATS;
  after?: string;
  className?: string;
}) {
  const mode = useMode();
  const tz = mode === null ? "UTC" : zoneFor(mode, zone);
  const text = format(iso, show, tz);
  if (after && format(after, show, tz) === text) {
    return <span aria-hidden className={className} />;
  }
  if (mode === null) {
    return <span className={`invisible ${className}`}>{text}</span>;
  }
  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}

/**
 * An instant in the reader's own zone, always — for pages outside `/f1`
 * that have no "track time" switch, so a choice made in the section never
 * leaks into a clock that cannot show it.
 */
export function LocalWhen({
  iso,
  show,
  className = "",
}: {
  iso: string;
  show: keyof typeof FORMATS;
  className?: string;
}) {
  const mode = useMode();
  if (mode === null) {
    return <span className={`invisible ${className}`}>{format(iso, show, "UTC")}</span>;
  }
  return (
    <time dateTime={iso} className={className}>
      {format(iso, show, undefined)}
    </time>
  );
}

/** "23–25 Oct", or "30 Oct – 1 Nov" across a month. */
export function DateRange({
  from,
  to,
  zone,
  className = "",
}: {
  from: string;
  to: string;
  zone: string | null;
  className?: string;
}) {
  const mode = useMode();
  const tz = mode === null ? "UTC" : zoneFor(mode, zone);
  const part = (iso: string) => {
    const f = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: tz,
    }).formatToParts(new Date(iso));
    return {
      day: f.find((p) => p.type === "day")?.value ?? "",
      month: f.find((p) => p.type === "month")?.value ?? "",
    };
  };
  const a = part(from);
  const b = part(to);
  const text =
    a.month === b.month
      ? a.day === b.day
        ? `${b.day} ${b.month}`
        : `${a.day}–${b.day} ${b.month}`
      : `${a.day} ${a.month} – ${b.day} ${b.month}`;
  return (
    <span className={`${mode === null ? "invisible" : ""} ${className}`}>
      {text}
    </span>
  );
}

/** "Europe/Brussels" → "Europe/Brussels", "America/Sao_Paulo" → "America/Sao Paulo". */
const zoneLabel = (z: string) => z.replace(/_/g, " ");

/**
 * The switch, and the line that says which clock the page is on.
 *
 * Two mono words in one frame — the site's sort toggle (DESIGN §7.3), neutral
 * rather than red, because it changes how the page is read, not what is on it.
 * Toggle buttons with `aria-pressed`, never half a tab pattern (§11.2).
 */
export function TimeToggle({
  zone,
  place,
}: {
  /** The circuit's zone, or null when the venue has none on file. */
  zone: string | null;
  /** "Austin" — what "track time" means on this page. */
  place: string;
}) {
  const mode = useMode();
  const local =
    mode === null ? null : Intl.DateTimeFormat().resolvedOptions().timeZone;

  const button = (value: TimeMode, label: string) => {
    const on = (mode ?? "local") === value;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setMode(value)}
        className={`pressable px-2.5 py-1.5 font-mono text-[0.65rem] tracking-wider uppercase transition-colors ${
          on ? "bg-glass-strong text-ink" : "text-ink-mute hover:text-ink-dim"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex overflow-hidden rounded-control border border-line">
        {button("local", "Your time")}
        {button("track", "Track time")}
      </span>
      <span
        className={`font-mono text-[0.7rem] text-ink-mute ${mode === null ? "invisible" : ""}`}
      >
        {mode === "track"
          ? zone
            ? `${place} · ${zoneLabel(zone)}`
            : `${place} · UTC`
          : local
            ? zoneLabel(local)
            : "UTC"}
      </span>
    </div>
  );
}

/**
 * A clock that moves twice a minute, for the "in 4d 2h" labels. Rounded, so
 * the snapshot is stable between ticks — `useSyncExternalStore` re-renders
 * only when the value changes.
 */
const TICK = 30_000;
function subscribeTick(cb: () => void) {
  const id = window.setInterval(cb, TICK);
  return () => window.clearInterval(id);
}
const tick = () => Math.floor(Date.now() / TICK) * TICK;

/** "in 4d 2h", "in 35 min". Nothing once the moment has passed. */
export function Until({ iso, className = "" }: { iso: string; className?: string }) {
  const now = useSyncExternalStore(subscribeTick, tick, () => null);
  if (now === null) {
    return <span className={`invisible ${className}`}>in 0d 0h</span>;
  }
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const min = Math.ceil(ms / 60_000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const text = d > 0 ? `in ${d}d ${h}h` : h > 0 ? `in ${h}h ${m}m` : `in ${m} min`;
  return <span className={className}>{text}</span>;
}
