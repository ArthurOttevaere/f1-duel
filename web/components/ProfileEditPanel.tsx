"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import UsernameForm from "@/components/UsernameForm";
import PlayerDetailsForm from "@/components/PlayerDetailsForm";
import type { Details } from "@/components/PlayerDetailsFields";

/**
 * Everything the owner can change about themselves, behind one button.
 *
 * The profile used to carry its own editing furniture in the page — a "change
 * username" link under the title, a details card wedged between the header and
 * the duel history. Both are here now, so the page a visitor sees and the page
 * the owner sees are the same page, with one extra button.
 *
 * Saving is each form's own business (both write to Supabase and refresh the
 * route); this only decides when the panel is on screen. The username form
 * navigates to the new URL on success, which closes the panel by unmounting it.
 */
export default function ProfileEditPanel({
  username,
  details,
}: {
  username: string;
  details: Details;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Portals need the DOM; only render into document.body after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag for the portal
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // The page behind must not scroll under the panel on touch.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Rendered on <body> rather than in place: the button next to it is a
  // `.glass-chip`, and a backdrop-filter anywhere up the tree turns into a
  // containing block that traps this position:fixed panel (§9.7 of the
  // Almanac — the same trap the mobile menu fell into).
  const overlay =
    open && mounted
      ? createPortal(
          <div
            className="sheet-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              ref={panel}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Edit profile"
              onClick={(e) => e.stopPropagation()}
              className="sheet-panel glass-card max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-b-none p-6 outline-none sm:rounded-b-[1.25rem]"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="display text-lg font-extrabold tracking-tight">Edit profile</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="pressable -mr-1 -mt-1 rounded-control px-2 py-1 text-xl leading-none text-ink-mute transition-colors hover:text-ink"
                >
                  ×
                </button>
              </div>

              <section className="mt-6">
                <h3 className="mb-3 font-mono text-[0.65rem] tracking-[0.18em] text-ink-dim uppercase">
                  Username
                </h3>
                <UsernameForm initial={username} mode="edit" />
              </section>

              <hr className="my-6 border-line" />

              <section>
                <h3 className="mb-3 font-mono text-[0.65rem] tracking-[0.18em] text-ink-dim uppercase">
                  Your details
                </h3>
                <PlayerDetailsForm initial={details} mode="edit" />
              </section>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable glass-chip rounded-control px-5 py-2 text-sm font-medium text-ink-dim transition-colors hover:border-line-hi hover:text-ink"
      >
        Edit profile
      </button>
      {overlay}
    </>
  );
}
