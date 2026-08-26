"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

/** The one button on an invite page. Lands you on the board you just joined. */
export default function JoinLeagueButton({
  code,
  leagueId,
  name,
}: {
  code: string;
  leagueId: number;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.rpc("join_league", { p_code: code });
    if (err) {
      setBusy(false);
      setError(
        err.message.includes("Unknown")
          ? "This invite no longer matches a league."
          : err.message,
      );
      return;
    }
    // Straight to the board rather than back to a page saying "joined!" — the
    // board is the answer to "what did I just join".
    router.replace(`/game/standings?league=${leagueId}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={join}
        disabled={busy}
        className="pressable mt-6 inline-flex items-center gap-2 btn-race px-6 py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy && <Spinner />}
        {busy ? "Joining…" : `Join ${name}`}
      </button>
      {error && <p className="mt-3 text-sm text-race">{error}</p>}
    </>
  );
}
