"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

/**
 * Self-serve account deletion, as the last row of the profile page's account
 * section.
 *
 * Everything goes at once: the auth user is deleted server-side by
 * `delete_account()`, and the foreign keys take the profile, the private
 * details, every prediction and score, league membership — and any league the
 * player created, which is why that is spelled out rather than discovered by
 * their friends.
 *
 * Typing the username is the guard. A single confirm dialog is too easy to
 * agree to for something with no undo.
 *
 * ## Why it is quiet until it isn't
 *
 * This used to be a permanently red-tinted panel with a red heading and a red
 * button, sitting under a second panel for signing out. Three things were
 * wrong with that. It is a band, and the charte separates with space and type
 * (§1.4). It gave a routine, reversible action — signing out — the same weight
 * as the one that cannot be undone. And a box that shouts before anything is
 * at stake is a box people stop reading, which is the opposite of what a
 * destructive control wants.
 *
 * So the loudness tracks the actual risk, which is also what the site's other
 * destructive control does (`LeagueCardActions`): grey at rest, red once you
 * have asked for it. The red arrives with the confirmation, along with the
 * demand that you type your own name.
 */
export default function DeleteAccount({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const armed = typed.trim().toLowerCase() === username.toLowerCase();

  async function destroy() {
    if (!armed || busy) return;
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

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line py-4">
        <p className="max-w-prose text-sm text-ink-mute">
          <span className="font-medium text-ink-dim">Delete your account</span>{" "}
          and everything attached to it: details, predictions, scores, league
          membership, and any league you created. There is no undo.
        </p>
        {/* Grey, and red only under the pointer. The site's other destructive
            control rests grey too; the difference here is that this one warms
            to `race` rather than to `ink`, so the one irreversible button on
            the page says so before it is pressed. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pressable shrink-0 rounded-control px-3 py-1.5 text-sm font-medium text-ink-mute transition-colors hover:text-race"
        >
          Delete account
        </button>
      </div>
    );
  }

  return (
    // Armed. The tint and the red rule arrive now, because now there is
    // something to be loud about — see the note above.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void destroy();
      }}
      className="border-t border-line border-l-2 border-l-race bg-race/[0.05] py-4 pr-4 pl-4"
    >
      <p className="max-w-prose text-sm text-ink-dim">
        <span className="font-semibold text-ink">This cannot be undone.</span>{" "}
        Your details, predictions, scores and league membership go with the
        account, and any league you created disappears for its members too.
      </p>

      <label className="mt-4 block text-sm text-ink-dim">
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
          aria-invalid={error ? true : undefined}
          className="mt-1.5 block w-full max-w-xs min-w-0 rounded-control border border-line bg-black/25 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-race/60"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        {/* Outlined, not filled. Filled red is this site's primary action
            (§7.2), and the primary action here is keeping the account. */}
        <button
          type="submit"
          disabled={!armed || busy}
          className="pressable flex items-center gap-2 rounded-control border border-race/60 px-5 py-2 text-sm font-semibold text-race transition-colors hover:bg-race/10 disabled:opacity-40 disabled:hover:bg-transparent"
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
          className="pressable text-sm text-ink-mute transition-colors hover:text-ink"
        >
          Keep my account
        </button>
      </div>

      {/* Reserved, so arriving at an error does not shift the buttons under
          the pointer that is about to press one (§7.4). */}
      <p className="mt-2 min-h-[1.25rem] text-xs text-race" role="alert">
        {error}
      </p>
    </form>
  );
}
