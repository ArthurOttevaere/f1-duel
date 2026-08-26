"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Spinner from "@/components/Spinner";
import { driverColor } from "@/lib/teams";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { createClient } from "@/lib/supabase/client";
import { shortName } from "@/lib/format";
import type { Driver, Race } from "@/lib/types";
import { DriverAvatar } from "@/components/DriverChip";

type SaveState = "idle" | "saving" | "saved" | "error";
/** A fixed 10-slot grid: `null` = still empty. */
type Slots = (string | null)[];

const DESKTOP = "(min-width: 1024px)";

function isDesktop() {
  return (
    typeof window !== "undefined" && window.matchMedia(DESKTOP).matches
  );
}

function toSlots(picks: string[]): Slots {
  return Array.from({ length: 10 }, (_, i) => picks[i] ?? null);
}

/**
 * Marks the grip button. A touch that starts on it skips the press-and-hold
 * delay — a handle exists to be dragged, and waiting on it would feel broken.
 */
const HANDLE_ATTR = "data-drag-handle";

function fromHandle(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(`[${HANDLE_ATTR}]`));
}

/** A short tick of haptic feedback where the platform offers it (Android). */
function tick() {
  if (typeof navigator !== "undefined") navigator.vibrate?.(8);
}

// ─── One row of the top 10 ───────────────────────────────────────────────────

function Slot({
  driver,
  position,
  active,
  disabled,
  onSelect,
  onClear,
}: {
  driver: Driver | null;
  position: number;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: driver?.driver_id ?? `empty-${position}`, disabled: disabled || !driver });

  const color = driverColor(driver);
  // dnd-kit types its listener map as Record<string, Function>, which React's
  // props are stricter than.
  const onRowTouchStart = listeners?.onTouchStart as
    | React.TouchEventHandler<HTMLLIElement>
    | undefined;

  return (
    <li
      ref={setNodeRef}
      style={{
        // A touch of scale while it travels: with a finger on the row instead
        // of a grip, the lift is the only confirmation the hold registered.
        transform: CSS.Transform.toString(
          transform && isDragging
            ? { ...transform, scaleX: 1.02, scaleY: 1.02 }
            : transform,
        ),
        transition,
      }}
      // Touch only: press and hold anywhere on the row to pick it up. The
      // mouse listeners stay on the grip, so a click on the name or the cross
      // is never at risk of turning into a drag on desktop.
      onTouchStart={onRowTouchStart}
      // A long press on iOS otherwise raises the text-selection callout on top
      // of the drag.
      className={`relative flex touch-manipulation items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors select-none [-webkit-touch-callout:none] sm:gap-3 sm:px-3 ${
        // Exactly one background: a dragged row travels over its neighbours,
        // and the translucent bg-glass showed both at once. #16181f is the
        // card colour composited onto the page background.
        isDragging
          ? "z-10 border-line-hi bg-[#16181f] shadow-lg"
          : driver
            ? active
              ? "border-race/70 bg-race/5"
              : "border-line bg-glass"
            : active
              ? "border-dashed border-race/70 bg-race/5"
              : "border-dashed border-line bg-transparent"
      }`}
    >
      <span
        className={`w-7 shrink-0 font-mono text-sm ${
          active ? "text-race" : "text-ink-mute"
        }`}
      >
        P{position}
      </span>

      {driver ? (
        <>
          <span
            aria-hidden
            className="h-7 w-1 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <DriverAvatar driver={driver} size={32} />
          <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className="flex min-w-0 flex-1 items-baseline gap-2 py-1 text-left disabled:cursor-default"
          >
            <span className="truncate text-sm font-medium">
              {shortName(driver.driver_id)}
            </span>
            <span className="hidden truncate text-xs text-ink-mute sm:inline">
              {driver.team}
            </span>
          </button>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={onClear}
                aria-label={`Clear P${position}`}
                className="pressable -m-1 rounded-full p-2 text-ink-mute transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                  <path
                    d="M3 3l10 10M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {/* The grip stays: it is the keyboard activator, the mouse's
                  only way in, and the visible sign that rows move at all. */}
              <button
                type="button"
                ref={setActivatorNodeRef}
                aria-label={`Reorder ${shortName(driver.driver_id)}`}
                style={{ touchAction: "none" }}
                className="-m-1 cursor-grab rounded-full p-2 text-ink-mute active:cursor-grabbing"
                {...{ [HANDLE_ATTR]: "" }}
                {...attributes}
                {...listeners}
              >
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
                  <path
                    d="M3 5h10M3 8h10M3 11h10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className="flex flex-1 items-center justify-between py-1.5 text-left text-sm text-ink-mute disabled:cursor-default"
        >
          {/* "Tap" was shown to everyone, mouse included. The instruction is
              also genuinely different per input: a finger opens the picker
              sheet from the slot, a mouse clicks a driver in the pool on the
              right. Pointer media queries rather than a viewport width —
              this is about what you are holding, not how wide it is. */}
          <span>
            {active ? (
              "Choose a driver…"
            ) : (
              <>
                <span className="pointer-coarse:hidden">
                  Pick a driver from the list
                </span>
                <span className="hidden pointer-coarse:inline">
                  Tap to choose a driver
                </span>
              </>
            )}
          </span>
          <span aria-hidden className="text-ink-mute">
            +
          </span>
        </button>
      )}
    </li>
  );
}

// ─── The roster, used inline on desktop and inside the sheet on mobile ───────

function DriverPool({
  roster,
  slots,
  disabled,
  onPick,
  compact,
}: {
  roster: Driver[];
  slots: Slots;
  disabled: boolean;
  onPick: (driverId: string) => void;
  compact?: boolean;
}) {
  const positionOf = useMemo(() => {
    const m = new Map<string, number>();
    slots.forEach((id, i) => id && m.set(id, i + 1));
    return m;
  }, [slots]);

  return (
    <div
      className={`grid gap-1.5 ${compact ? "grid-cols-2" : "grid-cols-2 xl:grid-cols-3"}`}
    >
      {roster.map((d) => {
        const at = positionOf.get(d.driver_id);
        return (
          <button
            key={d.driver_id}
            type="button"
            onClick={() => onPick(d.driver_id)}
            disabled={disabled}
            aria-pressed={Boolean(at)}
            className={`pressable flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors disabled:opacity-45 ${
              at
                ? "border-race/50 bg-race/10"
                : "border-line bg-glass hover:border-line-hi"
            }`}
          >
            <DriverAvatar driver={d} size={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">
                {shortName(d.driver_id)}
              </span>
              <span className="block truncate text-[0.65rem] text-ink-mute">
                {d.team}
              </span>
            </span>
            {at && (
              <span className="shrink-0 rounded-md bg-race px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-white">
                P{at}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Mobile bottom sheet ─────────────────────────────────────────────────────

function PickerSheet({
  open,
  slot,
  slots,
  roster,
  onPick,
  onClose,
}: {
  open: boolean;
  slot: number;
  slots: Slots;
  roster: Driver[];
  onPick: (driverId: string) => void;
  onClose: () => void;
}) {
  // Lock the page behind the sheet so only the sheet scrolls.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // `open` only ever flips on a client event, so the portal never runs on the
  // server and no mounted flag is needed.
  if (!open) return null;

  const filled = slots.filter(Boolean).length;

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close driver picker"
        onClick={onClose}
        className="sheet-backdrop absolute inset-0 bg-black/65"
      />
      <div className="sheet-panel absolute inset-x-0 bottom-0 flex max-h-[85svh] flex-col rounded-t-3xl border-t border-line bg-[#0d0f14] shadow-[0_-20px_50px_rgb(0_0_0/0.6)]">
        <div className="shrink-0 px-4 pt-3">
          <span
            aria-hidden
            className="mx-auto block h-1 w-10 rounded-full bg-line-hi"
          />
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs tracking-[0.15em] text-race uppercase">
                Filling P{slot + 1}
              </p>
              <p className="mt-0.5 text-sm text-ink-dim">
                {filled}/10 picked · tap a driver
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="pressable glass-chip rounded-full px-4 py-1.5 text-sm font-medium"
            >
              Done
            </button>
          </div>

          {/* Live progress: the pick lands here, in view, without closing. */}
          <div className="no-scrollbar -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-3">
            {slots.map((id, i) => (
              <span
                key={i}
                className={`flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 font-mono text-[0.65rem] ${
                  i === slot
                    ? "border-race bg-race/15 text-race"
                    : id
                      ? "border-line bg-glass text-ink-dim"
                      : "border-dashed border-line text-ink-mute"
                }`}
              >
                {i + 1}
                {id && (
                  <span className="font-sans font-medium text-ink">
                    {shortName(id)}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <DriverPool
            roster={roster}
            slots={slots}
            disabled={false}
            onPick={onPick}
            compact
          />
          <p className="mt-4 text-center text-xs text-ink-mute">
            Tapping a driver who is already in your top 10 swaps the two
            positions.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

export default function PredictionEditor({
  race,
  roster,
  initialPicks,
  initialDotd,
  initialScBet,
  canPlay,
  signedIn,
  previewEntry = null,
}: {
  race: Race;
  roster: Driver[];
  initialPicks: string[];
  initialDotd: string | null;
  initialScBet: boolean | null;
  canPlay: boolean;
  signedIn: boolean;
  /**
   * A finished entry of the model's, shown behind the sign-in veil so a
   * visitor sees a real grid instead of ten empty rows. Signed-out only, and
   * always a race that is already over — never this weekend's picks.
   */
  previewEntry?: { order: string[]; raceName: string } | null;
}) {
  // A preview is not a draft: it is only ever read, because `canPlay` is false
  // for everyone who sees it.
  const preview = !signedIn && (previewEntry?.order.length ?? 0) > 0;
  const [slots, setSlots] = useState<Slots>(() =>
    toSlots(preview ? (previewEntry as { order: string[] }).order : initialPicks),
  );
  const [dotd, setDotd] = useState<string | null>(initialDotd);
  const [scBet, setScBet] = useState<boolean | null>(initialScBet);
  const [active, setActive] = useState(() => {
    const i = toSlots(initialPicks).findIndex((id) => !id);
    return i === -1 ? 0 : i;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(
    JSON.stringify([toSlots(initialPicks), initialDotd, initialScBet]),
  );
  // Whether the slot we are filling was empty when the sheet opened — an empty
  // slot means "keep going", a filled one means the player wanted that one row.
  const replacing = useRef(false);

  const byId = useMemo(
    () => new Map(roster.map((d) => [d.driver_id, d])),
    [roster],
  );
  const activeRoster = useMemo(() => roster.filter((d) => d.active), [roster]);
  const filled = slots.filter(Boolean).length;
  const complete = filled === 10;
  const dirty = JSON.stringify([slots, dotd, scBet]) !== savedSnapshot;

  // Mouse and touch are split on purpose (rather than one PointerSensor): they
  // want different gestures. A mouse drags from the grip after a few pixels; a
  // finger picks a row up by pressing and holding it anywhere, which leaves a
  // plain swipe free to scroll the list.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
      bypassActivationConstraint: ({ event }) => fromHandle(event.target),
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nextEmpty = useCallback(
    (from: number, current: Slots) => {
      for (let i = from; i < 10; i++) if (!current[i]) return i;
      for (let i = 0; i < from; i++) if (!current[i]) return i;
      return -1;
    },
    [],
  );

  function selectSlot(i: number) {
    if (!canPlay) return;
    setActive(i);
    replacing.current = Boolean(slots[i]);
    if (!isDesktop()) setSheetOpen(true);
  }

  function clearSlot(i: number) {
    setSlots((s) => s.map((id, j) => (j === i ? null : id)));
    setActive(i);
    replacing.current = false;
  }

  /** Put a driver in the active slot — swapping if they are already in the top 10. */
  function pick(driverId: string) {
    if (!canPlay) return;
    tick();

    const next = [...slots];
    const from = next.indexOf(driverId);
    if (from === active) {
      next[active] = null; // tapping the current pick clears it
      setSlots(next);
      return;
    }
    if (from !== -1) next[from] = next[active]; // swap, never duplicate
    next[active] = driverId;
    setSlots(next);

    // Filling an empty slot means "keep going"; replacing one was a targeted
    // edit, so the sheet gets out of the way.
    const after = replacing.current ? -1 : nextEmpty(active + 1, next);
    if (after === -1) setSheetOpen(false);
    else setActive(after);
    // One targeted edit only — the next pick resumes filling forward.
    replacing.current = false;
  }

  function onDragEnd(event: DragEndEvent) {
    const { active: a, over } = event;
    if (!over || a.id === over.id) return;
    const ids = slots.map((id, i) => id ?? `empty-${i + 1}`);
    const from = ids.indexOf(String(a.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    setSlots((s) => arrayMove(s, from, to));
  }

  async function save() {
    setSaveState("saving");
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaveState("error");
      setError("You need to sign in first.");
      return;
    }
    const { error: err } = await supabase.from("predictions").upsert(
      {
        user_id: user.id,
        race_id: race.id,
        picks: slots.filter(Boolean) as string[],
        dotd,
        sc_bet: scBet,
      },
      { onConflict: "user_id,race_id" },
    );
    if (err) {
      setSaveState("error");
      setError(err.message);
    } else {
      setSavedSnapshot(JSON.stringify([slots, dotd, scBet]));
      setSaveState("saved");
    }
  }

  const sortableIds = slots.map((id, i) => id ?? `empty-${i + 1}`);

  return (
    <div className="relative flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── Your top 10 ── */}
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-ink-dim">
              {preview ? "THE MODEL'S TOP 10" : "YOUR TOP 10"}
            </h3>
            {/* The counter is yours; over the model's entry it would read as a
                score. */}
            {!preview && (
              <span className="font-mono text-xs text-ink-mute">
                {filled}/10
              </span>
            )}
          </div>

          {/* Progress rail: 10 ticks that fill as the grid comes together. */}
          <div aria-hidden className="mb-3 flex gap-1">
            {slots.map((id, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  id ? "bg-race" : "bg-line"
                }`}
              />
            ))}
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            // The row lifting under your finger is the only sign the hold
            // worked; on Android a tick confirms it before you look.
            onDragStart={tick}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-1.5">
                {slots.map((id, i) => (
                  <Slot
                    key={sortableIds[i]}
                    driver={id ? (byId.get(id) ?? null) : null}
                    position={i + 1}
                    active={canPlay && active === i}
                    disabled={!canPlay}
                    onSelect={() => selectSlot(i)}
                    onClear={() => clearSlot(i)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>

          {canPlay && filled > 1 && (
            <p className="mt-2 text-center text-xs text-ink-mute lg:hidden">
              Hold a driver to move them
            </p>
          )}

          {canPlay && (
            <button
              type="button"
              onClick={() => selectSlot(complete ? active : nextEmpty(0, slots))}
              className="pressable mt-3 w-full rounded-xl border border-line-hi py-3 text-sm font-semibold transition-colors hover:bg-glass-strong lg:hidden"
            >
              {complete
                ? "Change a driver"
                : `Choose drivers (${10 - filled} left)`}
            </button>
          )}
        </section>

        {/* ── Roster (desktop) + side bets ── */}
        <section className="flex flex-col">
          <div className="hidden lg:block">
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
              DRIVERS{" "}
              <span className="font-normal text-ink-mute">
                · click to place in P{active + 1}
              </span>
            </h3>
            <DriverPool
              roster={activeRoster}
              slots={slots}
              disabled={!canPlay}
              onPick={pick}
            />
          </div>

          <h3 className="mb-2 text-sm font-semibold tracking-wide text-ink-dim lg:mt-6">
            DRIVER OF THE DAY{" "}
            <span className="font-normal text-ink-mute">· +5 pts, optional</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {activeRoster.map((d) => (
              <button
                key={d.driver_id}
                type="button"
                disabled={!canPlay}
                onClick={() =>
                  setDotd(dotd === d.driver_id ? null : d.driver_id)
                }
                className={`pressable rounded-full border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-45 ${
                  dotd === d.driver_id
                    ? "border-race bg-race/15 text-race"
                    : "border-line text-ink-dim hover:border-line-hi"
                }`}
              >
                {d.code}
              </button>
            ))}
          </div>

          <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-ink-dim">
            SAFETY CAR{" "}
            <span className="font-normal text-ink-mute">
              · +8 pts · the model bets too
            </span>
          </h3>
          <p className="mb-2 text-xs text-ink-mute">
            Will a safety car (full or virtual) come out this race?
          </p>
          <div className="flex gap-1.5">
            {(
              [
                { val: true, label: "Yes" },
                { val: false, label: "No" },
              ] as const
            ).map((o) => (
              <button
                key={o.label}
                type="button"
                disabled={!canPlay}
                onClick={() => setScBet(scBet === o.val ? null : o.val)}
                className={`pressable flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-45 ${
                  scBet === o.val
                    ? "border-race bg-race/15 text-race"
                    : "border-line text-ink-dim hover:border-line-hi"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Save — rides the bottom of the viewport while the editor is in
             view, so the button is never a scroll away. The negative margins
             bleed it to the edges of the `glass-card p-6` it sits in. ── */}
      {canPlay && (
        <div className="sticky bottom-0 -mx-6 -mb-6 flex items-center gap-4 rounded-b-[1.25rem] border-t border-line bg-[#0d0f14]/95 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
          <button
            type="button"
            onClick={save}
            disabled={!complete || !dirty || saveState === "saving"}
            className="pressable flex flex-1 items-center justify-center gap-2 btn-race px-7 py-3 text-sm font-semibold disabled:opacity-45 sm:flex-none"
          >
            {saveState === "saving" && <Spinner />}
            {saveState === "saving"
              ? "Saving…"
              : complete
                ? "Lock in prediction"
                : `Pick ${10 - filled} more`}
          </button>
          <span aria-live="polite" className="text-xs text-ink-mute sm:text-sm">
            {saveState === "saved" && !dirty && "Saved ✓ editable until lights out"}
            {error}
          </span>
        </div>
      )}

      <PickerSheet
        open={sheetOpen && canPlay}
        slot={active}
        slots={slots}
        roster={activeRoster}
        onPick={pick}
        onClose={() => setSheetOpen(false)}
      />

      {/* ── Sign-in gate ──
             The veil used to be 70% ground and 3px of blur over an empty
             form, which turned the one screen where the game happens into a
             grey rectangle. It is thinner now — the point is to say "not yet
             yours", not to hide the product — and what it covers is a real
             top 10 (see `previewOrder`). The call to action carries its own
             surface, because at this opacity the grid behind it would
             otherwise read straight through the type. */}
      {!signedIn && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-bg/45 backdrop-blur-[2px]">
          <div className="glass-card mx-4 max-w-sm p-6 text-center">
            <p className="font-semibold">Sign in to enter the duel</p>
            {preview && (
              <p className="mt-2 text-sm text-ink-dim">
                Behind this is the model&apos;s own top 10 at the{" "}
                {previewEntry?.raceName}. Yours goes next to it.
              </p>
            )}
            <Link
              href="/login"
              className="pressable mt-4 inline-block rounded-full bg-race px-7 py-3 text-sm font-semibold text-white"
            >
              Sign in — it takes 20 seconds
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
