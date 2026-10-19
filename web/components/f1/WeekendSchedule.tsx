import Link from "next/link";
import type { Weekend } from "@/lib/f1/types";
import { SessionLink } from "./SessionResults";
import { Until, When } from "./SessionTime";

const RESULT_LINK =
  "text-ink-dim underline-offset-2 transition-colors hover:text-ink hover:underline";

/**
 * A weekend's sessions, one line each: day, start, session, state.
 *
 * Every time goes through `When`, so the whole list follows the section's
 * clock (your zone or the circuit's). The day prints once per day and stays
 * blank under it, which is how a paddock timetable is set.
 *
 * The state column is the only thing that changes over a weekend: the next
 * session counts down, one under way says so in race red — the only red on
 * the list, because it is the one thing happening — and a finished one says
 * it is done, or links to its classification when the page has one to show.
 *
 * "Under way" is not live timing. OpenF1's live feed is paid; the result
 * lands here after the session, and the weekend page says when to expect it.
 */
export default function WeekendSchedule({
  weekend,
  now,
  resultsHref,
}: {
  weekend: Weekend;
  /** Server time of the render, ms. */
  now: number;
  /** Where a finished session's result lives: `kind` → href, "" for nowhere. */
  resultsHref?: (kind: string) => string;
}) {
  const next = weekend.sessions.find((s) => new Date(s.start).getTime() > now);

  return (
    <ol className="border-b border-line">
      {weekend.sessions.map((s, i) => {
        const start = new Date(s.start).getTime();
        const end = new Date(s.end).getTime();
        const state = end <= now ? "done" : start <= now ? "live" : "upcoming";
        const isRace = s.kind === "race";
        const prev = weekend.sessions[i - 1];
        const href = resultsHref?.(s.kind);

        return (
          <li
            key={s.kind}
            className="grid grid-cols-[5.5rem_3rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-line px-2 py-3 sm:grid-cols-[7.5rem_4rem_minmax(0,1fr)_auto] sm:gap-x-5"
          >
            <When
              iso={s.start}
              zone={weekend.timeZone}
              show="day"
              after={prev?.start}
              className="font-mono text-[0.7rem] tracking-wider text-ink-mute uppercase"
            />
            {s.tbc ? (
              <span className="font-mono text-sm text-ink-mute">TBC</span>
            ) : (
              <When
                iso={s.start}
                zone={weekend.timeZone}
                show="time"
                className={`font-mono text-sm tabular-nums ${
                  state === "done" ? "text-ink-mute" : "text-ink"
                }`}
              />
            )}
            <span
              className={`truncate text-sm ${
                state === "done"
                  ? "text-ink-mute"
                  : isRace
                    ? "font-semibold text-ink"
                    : "text-ink-dim"
              }`}
            >
              {s.name}
            </span>
            <span className="text-right font-mono text-[0.7rem]">
              {state === "live" ? (
                <span className="flex items-center gap-1.5 text-race">
                  <span aria-hidden className="size-1.5 rounded-full bg-race" />
                  Under way
                </span>
              ) : state === "done" ? (
                href ? (
                  href.startsWith("#") ? (
                    <SessionLink kind={s.kind} className={RESULT_LINK}>
                      Result
                    </SessionLink>
                  ) : (
                    <Link href={href} className={RESULT_LINK}>
                      Result
                    </Link>
                  )
                ) : (
                  <span className="text-ink-mute">Done</span>
                )
              ) : s === next ? (
                <Until iso={s.start} className="text-ink" />
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
