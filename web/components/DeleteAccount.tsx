"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

/**
 * Self-serve account deletion.
 *
 * Everything goes at once: the auth user is deleted server-side by
 * `delete_account()`, and the foreign keys take the profile, the private
 * details, every prediction and score, league membership — and any league the
 * player created, which is why that is spelled out below rather than
 * discovered by their friends.
 *
 * Typing the username is the guard. A single confirm dialog is too easy to
 * agree to for something with no undo.
 */
export default function DeleteAccount({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const armed = typed.trim().toLowerCase() === username.toLowerCase();

  async function destroy() {
    if (!armed) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("delete_account");
    if (err) {
      setBusy(false);
      setError(
        err.message.includes("delete_account")
          ? "Account deletion isn't enabled on this server yet."
          : err.message,
      );
      return;
    }
    // The session now points at a user that no longer exists; clear it and
    // leave through a full navigation so no server-rendered page is left
    // holding the old cookies.
    await supabase.auth.signOut().catch(() => {});
    window.location.assign("/login?deleted=1");
  }

  return (
    <section className="mt-8 rounded-panel border border-race/30 bg-race/[0.04] p-6">
      <h2 className="text-sm font-semibold tracking-wide text-race">
        DELETE ACCOUNT
      </h2>

      {!open ? (
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-prose text-sm text-ink-dim">
            Removes your account and everything attached to it — details,
            predictions, scores, league membership, and any league you created.
            It cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pressable shrink-0 rounded-control border border-race/60 px-5 py-2 text-sm font-semibold text-race transition-colors hover:bg-race/10"
          >
            Delete my account
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="max-w-prose text-sm text-ink-dim">
            This deletes your details, predictions, scores and league
            membership, and any league you created disappears for its members
            too. There is no undo.
          </p>
          <label className="text-sm text-ink-dim">
            Type <span className="font-semibold text-ink">{username}</span> to
            confirm
            <input
              autoFocus
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-1 block w-full max-w-xs rounded-control border border-line bg-black/25 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-race/60"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={destroy}
              disabled={!armed || busy}
              className="pressable flex items-center gap-2 btn-race px-5 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {busy && <Spinner />}
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              className="text-sm text-ink-mute transition-colors hover:text-ink"
            >
              Keep my account
            </button>
          </div>
          {error && <p className="text-sm text-race">{error}</p>}
        </div>
      )}
    </section>
  );
}
