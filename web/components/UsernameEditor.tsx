"use client";

import { useState } from "react";
import UsernameForm from "@/components/UsernameForm";

/** The owner's rename control, folded away until asked for. */
export default function UsernameEditor({ username }: { username: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable mt-2 text-xs text-ink-mute underline transition-colors hover:text-ink-dim"
      >
        Change username
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-xs">
      <UsernameForm initial={username} mode="edit" />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-xs text-ink-mute underline transition-colors hover:text-ink-dim"
      >
        Cancel
      </button>
    </div>
  );
}
