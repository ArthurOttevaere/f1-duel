"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Classification, SessionKind } from "@/lib/f1/types";
import ClassificationTable from "./ClassificationTable";

export interface SessionEntry {
  kind: SessionKind;
  /** Short label for the switch: "FP1", "Quali", "Grand Prix". */
  label: string;
  outcome: Classification | "pending" | "unavailable";
}

/**
 * A weekend's classifications, one at a time.
 *
 * Seven sessions of twenty-two rows is a hundred and fifty lines, and nobody
 * reads Practice 1 on the way to the Grand Prix. That is the case DESIGN §7.10
 * leaves open for hiding something: showing it all costs more than the
 * click. So a row of toggles (`aria-pressed`, not half a tab pattern, §11.2)
 * picks the session, and every classification is already on the page —
 * switching is instant and needs no spinner.
 *
 * The choice is the URL's hash (`/f1/17#quali`), so the schedule above and the
 * Results page can link straight to a session, and a link shared is the
 * session shared. It is replaced, not pushed: flicking through sessions should
 * not fill the back button.
 */

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("hashchange", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("hashchange", cb);
  };
}
const readHash = () => window.location.hash.slice(1);

function select(kind: string) {
  // Next patches `replaceState` and keeps its own router state on the entry;
  // a native `#anchor` would push an entry with none, and "back" to it
  // leaves the previous page on screen (the app router ignores a stateless
  // popstate).
  window.history.replaceState(window.history.state, "", `#${kind}`);
  listeners.forEach((l) => l());
}

const BOX_ID = "session-results";

/**
 * A link to one session's classification further down the same page — the
 * timetable's "Result". It selects and scrolls without a history entry; the
 * `href` is there for a new tab and for anyone without JavaScript.
 */
export function SessionLink({
  kind,
  className = "",
  children,
}: {
  kind: SessionKind;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`#${kind}`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        select(kind);
        document
          .getElementById(BOX_ID)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </a>
  );
}

export default function SessionResults({ entries }: { entries: SessionEntry[] }) {
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const box = useRef<HTMLDivElement>(null);

  // Arriving on a session (`/f1/17#quali`, from the Results page) or typing
  // one into the address bar selects through the hash, and this brings the
  // table into view — there is no element of that id for the browser to
  // scroll to. On arrival it jumps; on the same page it glides.
  useEffect(() => {
    const show = (behavior: ScrollBehavior) => {
      if (entries.some((e) => e.kind === readHash())) {
        box.current?.scrollIntoView({ behavior, block: "start" });
      }
    };
    show("auto");
    const onHash = () => show("smooth");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [entries]);
  // The latest session with something to show, unless the URL says otherwise.
  const fallback =
    [...entries].reverse().find((e) => typeof e.outcome === "object") ?? entries[entries.length - 1];
  const current = entries.find((e) => e.kind === hash) ?? fallback;
  if (!current) return null;

  return (
    <div ref={box} id={BOX_ID} className="scroll-mt-28">
      <div className="flex flex-wrap overflow-hidden rounded-control border border-line sm:inline-flex">
        {entries.map((e) => {
          const on = e.kind === current.kind;
          return (
            <button
              key={e.kind}
              type="button"
              aria-pressed={on}
              onClick={() => select(e.kind)}
              className={`pressable flex-1 px-3 py-2 font-mono text-[0.65rem] tracking-wider whitespace-nowrap uppercase transition-colors sm:flex-none sm:px-4 ${
                on ? "bg-glass-strong text-ink" : "text-ink-mute hover:text-ink-dim"
              }`}
            >
              {e.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {current.outcome === "pending" ? (
          <p className="rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute">
            {current.kind.startsWith("fp") || current.kind === "sprint_quali"
              ? "Not published yet — this one usually lands about half an hour after the session."
              : "Not published yet — the classification usually lands within a few hours of the flag."}
          </p>
        ) : current.outcome === "unavailable" ? (
          <p className="rounded-xl border border-line bg-glass px-4 py-8 text-center text-sm text-ink-mute">
            Couldn&apos;t reach the timing data for this session. Try again in a
            minute.
          </p>
        ) : (
          <ClassificationTable c={current.outcome} />
        )}
      </div>
    </div>
  );
}
