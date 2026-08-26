"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlayerDetailsFields, {
  detailsError,
  detailsPayload,
  EMPTY_DETAILS,
  type Details,
} from "@/components/PlayerDetailsFields";
import Spinner from "@/components/Spinner";

/**
 * Read/write the player's own `player_details` row, under the owner-only RLS
 * policies.
 *
 * `onboard` is the /welcome step Google and magic-link sign-ups get, since they
 * never pass through the sign-up form; `edit` is the correction control on your
 * own profile, which stays put instead of navigating away.
 */
export default function PlayerDetailsForm({
  initial = EMPTY_DETAILS,
  mode = "onboard",
  next = "/game",
}: {
  initial?: Details;
  mode?: "onboard" | "edit";
  next?: string;
}) {
  const router = useRouter();
  const [details, setDetails] = useState<Details>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = detailsError(details);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Your session expired — sign in again.");
      return;
    }

    // Upsert rather than insert: the signup trigger may already have written a
    // row, and neither a second pass through /welcome nor an edit must fail on
    // the primary key.
    const { error: err } = await supabase
      .from("player_details")
      .upsert({ id: user.id, ...detailsPayload(details) });

    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }

    if (mode === "edit") {
      setSaving(false);
      setSaved(true);
      router.refresh();
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <PlayerDetailsFields
        value={details}
        onChange={(d) => {
          setDetails(d);
          setError(null);
          setSaved(false);
        }}
        disabled={saving}
      />

      <p className="min-h-[1.25rem] text-xs">
        {error ? (
          <span className="text-race">{error}</span>
        ) : saved ? (
          <span className="text-emerald-400">Saved ✓</span>
        ) : (
          <span className="text-ink-mute">
            Only you can see this — it never appears on the standings.
          </span>
        )}
      </p>

      <button
        type="submit"
        disabled={saving}
        className="pressable flex items-center justify-center gap-2 btn-race py-3 text-sm font-semibold disabled:opacity-45"
      >
        {saving && <Spinner />}
        {saving ? "Saving…" : mode === "edit" ? "Save details" : "Finish"}
      </button>
    </form>
  );
}
