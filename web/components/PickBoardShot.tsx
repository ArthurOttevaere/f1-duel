import { loadLastRace } from "@/components/LastRaceProof";
import { DriverAvatar } from "@/components/DriverChip";
import { shortName } from "@/lib/format";
import { driverColor } from "@/lib/teams";
import type { Driver } from "@/lib/types";

/**
 * How many of the ten slots are shown filled — the next one is the open, lit
 * one. Five and not seven: the board is cropped to the height of the three
 * steps beside it, and at seven the open slot fell past the fade, which left a
 * board that looked finished rather than half-played.
 */
const FILLED = 5;

/**
 * The home page's product shot — and it is not a shot.
 *
 * The page sold a prediction game without ever showing the screen where you
 * predict, which asked the visitor for an act of faith. The obvious fix is a
 * screenshot in a browser frame, which is the next cliché along; the one after
 * that is a phone bezel. This is neither: it is the pick board's own markup,
 * server-rendered from the real roster, in an order that really happened.
 * Nothing to re-capture when the design moves, and nothing that can go stale.
 *
 * It is deliberately caught mid-task — seven slots filled, the eighth open and
 * lit — because a finished board says nothing about what you would do with it.
 *
 * Before the first race of a season there is no order to borrow, and the board
 * renders empty. That is not a fallback: it is exactly what the screen looks
 * like in March.
 */
export default async function PickBoardShot({
  className = "",
}: {
  className?: string;
}) {
  // Request-cached, and the proof section below already paid for it.
  const data = await loadLastRace();
  const byId = new Map((data?.roster ?? []).map((d) => [d.driver_id, d]));
  return (
    <PickBoard
      className={className}
      slots={Array.from({ length: 10 }, (_, i) =>
        i < FILLED ? (byId.get(data?.official[i] ?? "") ?? null) : null,
      )}
    />
  );
}

/** The replica itself, split out so it can be rendered from fixtures. */
export function PickBoard({
  slots,
  className = "",
}: {
  slots: (Driver | null)[];
  className?: string;
}) {
  const filled = slots.filter(Boolean).length;

  return (
    <div className={`relative ${className}`}>
      {/* The board is a picture of an interface: it has slot numbers, a grip
          on every row and an open field, none of which do anything. Announcing
          that to a screen reader would be a lie with ten rows in it, so the
          replica is hidden and this sentence stands in its place. */}
      <p className="sr-only">
        The prediction board, as it looks on a race weekend: ten numbered slots,
        {" "}
        {filled > 0
          ? `the first ${filled} filled with drivers you can drag into order, the next one open.`
          : "all ten waiting for a driver."}
      </p>

      <div
        aria-hidden
        className="shot-fade-y relative max-h-[26rem] overflow-hidden sm:max-h-[30rem] lg:absolute lg:inset-0 lg:max-h-none"
      >
        <div className="shot-fade-x">
          {/* Wider than its column from `lg` up: the difference is what runs
              past the frame. Below `lg` it is the column. */}
          <div className="w-full lg:w-[27rem] lg:max-w-none">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold tracking-wide text-ink-dim">
                YOUR TOP 10
              </span>
              <span className="font-mono text-xs text-ink-mute">
                {filled}/10
              </span>
            </div>

            {/* The real rail, with the real rule: ten ticks, one per slot. */}
            <div className="mb-3 flex gap-1">
              {slots.map((d, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 ${d ? "bg-race" : "bg-line"}`}
                />
              ))}
            </div>

            <ol className="flex flex-col gap-1.5">
              {slots.map((d, i) => {
                const open = !d && i === filled;
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-2.5 rounded-control border px-2.5 py-2 sm:gap-3 sm:px-3 ${
                      d
                        ? "border-line bg-glass"
                        : open
                          ? "border-dashed border-race/70 bg-race/5"
                          : "border-dashed border-line"
                    }`}
                  >
                    <span
                      className={`w-7 shrink-0 font-mono text-sm ${
                        open ? "text-race" : "text-ink-mute"
                      }`}
                    >
                      P{i + 1}
                    </span>

                    {d ? (
                      <>
                        <span
                          className="h-7 w-1 shrink-0"
                          style={{ background: driverColor(d) }}
                        />
                        <DriverAvatar driver={d} size={32} />
                        <span className="flex min-w-0 flex-1 items-baseline gap-2">
                          <span className="truncate text-sm font-medium">
                            {shortName(d.driver_id)}
                          </span>
                          <span className="hidden truncate text-xs text-ink-mute sm:inline">
                            {d.team}
                          </span>
                        </span>
                        <span className="p-2 text-ink-mute">
                          <svg viewBox="0 0 16 16" className="size-4">
                            <path
                              d="M3 5h10M3 8h10M3 11h10"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                        </span>
                      </>
                    ) : (
                      <span className="flex-1 py-1.5 text-sm text-ink-mute">
                        {open ? "Choose a driver…" : "Pick a driver from the list"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
