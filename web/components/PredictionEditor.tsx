"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
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

function SortableSlot({
  driver,
  position,
  onRemove,
  disabled,
}: {
  driver: Driver;
  position: number;
  onRemove: () => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: driver.driver_id, disabled });

  const color = driver.team_color ?? "#6c7280";

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 rounded-xl border border-line bg-glass px-3 py-2 select-none ${
        isDragging ? "z-10 border-line-hi shadow-lg" : ""
      } ${disabled ? "" : "cursor-grab active:cursor-grabbing"}`}
      {...attributes}
      {...listeners}
    >
      <span className="w-7 shrink-0 font-mono text-sm text-ink-mute">
        P{position}
      </span>
      <span
        aria-hidden
        className="h-6 w-1 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <DriverAvatar driver={driver} size={32} />
      <span className="flex-1 truncate text-sm font-medium">
        {shortName(driver.driver_id)}
        <span className="ml-2 hidden text-xs text-ink-mute sm:inline">
          {driver.team}
        </span>
      </span>
      {!disabled && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          aria-label={`Remove ${shortName(driver.driver_id)}`}
          className="pressable rounded-full px-2 py-1 text-ink-mute transition-colors hover:text-ink"
        >
          ✕
        </button>
      )}
    </li>
  );
}

export default function PredictionEditor({
  race,
  roster,
  initialPicks,
  initialDotd,
  canPlay,
  signedIn,
}: {
  race: Race;
  roster: Driver[];
  initialPicks: string[];
  initialDotd: string | null;
  canPlay: boolean;
  signedIn: boolean;
}) {
  const [picks, setPicks] = useState<string[]>(initialPicks);
  const [dotd, setDotd] = useState<string | null>(initialDotd);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const savedSnapshot = useRef(JSON.stringify([initialPicks, initialDotd]));

  const byId = useMemo(
    () => new Map(roster.map((d) => [d.driver_id, d])),
    [roster],
  );
  const pool = roster.filter((d) => d.active && !picks.includes(d.driver_id));
  const dirty = JSON.stringify([picks, dotd]) !== savedSnapshot.current;
  const complete = picks.length === 10;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPicks((p) =>
        arrayMove(p, p.indexOf(String(active.id)), p.indexOf(String(over.id))),
      );
    }
  }

  function add(driverId: string) {
    if (!canPlay || picks.length >= 10) return;
    setPicks((p) => [...p, driverId]);
  }

  function remove(driverId: string) {
    setPicks((p) => p.filter((id) => id !== driverId));
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
      { user_id: user.id, race_id: race.id, picks, dotd },
      { onConflict: "user_id,race_id" },
    );
    if (err) {
      setSaveState("error");
      setError(err.message);
    } else {
      savedSnapshot.current = JSON.stringify([picks, dotd]);
      setSaveState("saved");
    }
  }

  return (
    <div className="relative grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* ── Your top 10 ── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
          YOUR TOP 10
        </h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={picks} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-1.5">
              {picks.map((id, i) => {
                const driver = byId.get(id);
                if (!driver) return null;
                return (
                  <SortableSlot
                    key={id}
                    driver={driver}
                    position={i + 1}
                    onRemove={() => remove(id)}
                    disabled={!canPlay}
                  />
                );
              })}
              {Array.from({ length: 10 - picks.length }, (_, i) => (
                <li
                  key={`empty-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-ink-mute"
                >
                  <span className="w-7 font-mono">P{picks.length + i + 1}</span>
                  <span className="text-xs">
                    {i === 0 ? "Tap a driver to add →" : ""}
                  </span>
                </li>
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </section>

      {/* ── Driver pool + DotD + save ── */}
      <section className="flex flex-col">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
          DRIVERS
        </h3>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {pool.map((d) => (
            <button
              key={d.driver_id}
              type="button"
              onClick={() => add(d.driver_id)}
              disabled={!canPlay || picks.length >= 10}
              className="pressable flex items-center gap-2 rounded-xl border border-line bg-glass px-2.5 py-1.5 text-left transition-colors hover:border-line-hi disabled:opacity-45"
            >
              <DriverAvatar driver={d} size={28} />
              <span className="truncate text-xs font-medium">
                {shortName(d.driver_id)}
              </span>
            </button>
          ))}
          {pool.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-mute">
              Full house — your top 10 is complete.
            </p>
          )}
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold tracking-wide text-ink-dim">
          DRIVER OF THE DAY{" "}
          <span className="font-normal text-ink-mute">· +5 pts, optional</span>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {roster
            .filter((d) => d.active)
            .map((d) => (
              <button
                key={d.driver_id}
                type="button"
                disabled={!canPlay}
                onClick={() =>
                  setDotd(dotd === d.driver_id ? null : d.driver_id)
                }
                className={`pressable rounded-full border px-3 py-1 font-mono text-xs transition-colors disabled:opacity-45 ${
                  dotd === d.driver_id
                    ? "border-race bg-race/15 text-race"
                    : "border-line text-ink-dim hover:border-line-hi"
                }`}
              >
                {d.code}
              </button>
            ))}
        </div>

        {canPlay && (
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={!complete || !dirty || saveState === "saving"}
              className="pressable rounded-full bg-race px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(255_30_60/0.35)] transition-colors hover:bg-race-deep disabled:opacity-45 disabled:shadow-none"
            >
              {saveState === "saving"
                ? "Saving…"
                : complete
                  ? "Lock in prediction"
                  : `Pick ${10 - picks.length} more`}
            </button>
            <span aria-live="polite" className="text-sm text-ink-mute">
              {saveState === "saved" && !dirty && "Saved ✓ (editable until lights out)"}
              {error}
            </span>
          </div>
        )}
      </section>

      {/* ── Sign-in gate ── */}
      {!signedIn && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-bg/70 backdrop-blur-[3px]">
          <div className="text-center">
            <p className="font-semibold">Sign in to enter the duel</p>
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
