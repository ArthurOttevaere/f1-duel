"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { standingsHref } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import Spinner from "@/components/Spinner";

/**
 * Everything you can do to a league you are in: invite someone, and get out.
 *
 * The invite is a link rather than the six-letter code. The code still works
 * and is still on the card, but "open this and tap Join" survives a text
 * message in a way that "go to the site, find leagues, type FZ2K9P" does not.
 */
export default function LeagueCardActions({
  leagueId,
  name,
  code,
  isOwner,
  viewerId,
}: {
  leagueId: number;
  name: string;
  code: string;
  isOwner: boolean;
  viewerId: string;
}) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareable, setShareable] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The origin is only known in the browser, and share support only there too.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- client-only values */
    setLink(`${window.location.origin}/join/${code}`);
    setShareable(typeof navigator !== "undefined" && "share" in navigator);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [code]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const invite = `Join my F1 Duel league "${name}" — predict the top 10 of every Grand Prix and beat the model.`;

  async function share() {
    try {
      await navigator.share({ title: `F1 Duel · ${name}`, text: invite, url: link });
    } catch (e) {
      // Dismissing the share sheet is not a failure.
      if (e instanceof DOMException && e.name === "AbortError") return;
      await copy();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Couldn't copy — the link is in the box above.");
    }
  }

  /** Leaving, or — for the person who made it — taking the league with you. */
  async function quit() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = isOwner
      ? await supabase.from("leagues").delete().eq("id", leagueId)
      : await supabase
          .from("league_members")
          .delete()
          .eq("league_id", leagueId)
          .eq("user_id", viewerId);
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setConfirming(false);
    // Back to Global first: the URL still names a league that is now gone, and
    // refreshing alone would leave `?league=…` pointing at nothing.
    router.replace(standingsHref(null), { scroll: false });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {shareable && (
          <button
            type="button"
            onClick={share}
            className="pressable btn-race px-4 py-1.5 text-sm font-semibold"
          >
            Invite a friend
          </button>
        )}
        <button
          type="button"
          onClick={copy}
          className={`pressable rounded-control px-4 py-1.5 text-sm font-semibold transition-colors ${
            shareable
              ? "glass-chip hover:border-line-hi"
              : "btn-race"
          }`}
        >
          {copied ? "Link copied ✓" : "Copy invite link"}
        </button>

        {confirming ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-ink-dim">
              {isOwner ? "Delete for everyone?" : "Leave this league?"}
            </span>
            <button
              type="button"
              onClick={quit}
              disabled={busy}
              className="pressable flex items-center gap-1.5 rounded-control border border-race/60 px-3 py-1 text-sm font-semibold text-race disabled:opacity-60"
            >
              {busy && <Spinner className="text-xs" />}
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm text-ink-mute hover:text-ink"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-control px-3 py-1.5 text-sm text-ink-mute transition-colors hover:text-ink"
          >
            {isOwner ? "Delete league" : "Leave"}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-race">{error}</p>}
    </div>
  );
}
