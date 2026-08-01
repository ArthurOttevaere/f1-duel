"use client";

import { useState } from "react";
import PlayerDetailsForm from "@/components/PlayerDetailsForm";
import type { Details } from "@/components/PlayerDetailsFields";
import { countryFlag, countryName } from "@/lib/countries";

/**
 * The owner's own details, shown as a summary and folded open to edit — the
 * same shape as the rename control above it. Never rendered for a visitor:
 * RLS would return nothing anyway, but the section shouldn't exist for them.
 */
export default function PlayerDetailsEditor({ initial }: { initial: Details }) {
  const [open, setOpen] = useState(false);

  const name = [initial.firstName, initial.lastName].filter(Boolean).join(" ");
  const country = countryName(initial.country);
  const summary = [
    name || "No name on file",
    country ? `${countryFlag(initial.country)} ${country}` : null,
    initial.birthYear || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-dim">
        YOUR DETAILS
      </h2>

      <div className="glass-chip rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm">{summary}</p>
            <p className="mt-1 text-xs text-ink-mute">
              Private to you — other players only ever see your username.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="pressable rounded-full border border-line px-4 py-1.5 text-sm text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
          >
            {open ? "Cancel" : "Edit"}
          </button>
        </div>

        {open && (
          <div className="mt-5 max-w-sm">
            <PlayerDetailsForm initial={initial} mode="edit" />
          </div>
        )}
      </div>
    </section>
  );
}
