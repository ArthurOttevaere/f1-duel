import { DriverAvatar } from "@/components/DriverChip";
import TeamWordmark from "@/components/TeamWordmark";
import { formatPoints, shortName } from "@/lib/format";
import { TIER_SHORT, type Tier } from "@/lib/champions";
import { tint } from "@/lib/teams";
import type { Driver } from "@/lib/types";

/** "14 Mar 2026" — the day a call was locked, at the resolution a stub prints. */
function lockedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-2">
      <span className="font-mono text-[0.6rem] tracking-[0.16em] text-ink-mute uppercase">
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-xs text-ink-dim">
        {children}
      </span>
    </div>
  );
}

/**
 * A championship call, drawn as the thing it is: a betting stub.
 *
 * The two calls used to be two `glass-card`s carrying a name and a team — two
 * generic cards for the most singular object in the game. **A pick is a bet
 * locked for life, taken on a date, whose value depends on that date**, and
 * every part of that is already in the database (`GAME_DESIGN` §2.3): when it
 * was locked, where the driver stood at the time, how much of the season was
 * still to run, and what it finally paid. None of it was rendered anywhere.
 *
 * So the stub prints the four: the call, the date, the standing at lock, the
 * season left as a bar, and the value in the pick's own colour. Once the
 * season settles, the value is replaced by what was actually banked — a stub
 * that has been cashed.
 *
 * The perforation is `.stub-perf`: two hairlines and a notch at each end, made
 * of gradients like every other line on this site (§6.4). No image, nothing on
 * the wire.
 */
export default function PickStub({
  kind,
  driver,
  driverId,
  team,
  color,
  lockedAt,
  tier,
  prorate,
  worth,
  settled,
}: {
  kind: "driver" | "team";
  /** The roster row, when the call is a driver still on the grid. */
  driver?: Driver | null;
  driverId?: string;
  team?: string;
  color: string;
  lockedAt: string;
  tier: Tier | null;
  /** Fraction of the season still to run at lock, or null before the sync. */
  prorate: number | null;
  /** Points this half is on course for, or null while the rank is unknown. */
  worth: number | null;
  settled: boolean;
}) {
  const left = prorate === null ? null : Math.round(prorate * 100);

  return (
    <article
      className="stub rounded-panel border border-line px-5 py-4"
      style={{
        background: `linear-gradient(150deg, ${tint(color, 0.14)}, transparent 62%)`,
      }}
    >
      <p className="font-mono text-[0.6rem] tracking-[0.18em] text-ink-mute uppercase">
        {kind === "driver" ? "Drivers' champion" : "Constructors' champion"}
      </p>

      {kind === "driver" ? (
        <div className="mt-3 flex items-center gap-3">
          {driver ? (
            <DriverAvatar driver={driver} size={44} />
          ) : (
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
              style={{ background: tint(color, 0.2), color }}
            >
              {(driverId ? shortName(driverId) : "?").slice(0, 3).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="display truncate text-lg font-extrabold tracking-tight">
              {driver?.full_name ?? shortName(driverId ?? "")}
            </p>
            <p className="truncate font-mono text-[0.7rem] text-ink-mute">
              {driver?.team ?? "Not on this season's grid"}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex min-h-11 items-center">
          <TeamWordmark team={team ?? ""} color={color} size="lg" />
        </div>
      )}

      <div aria-hidden className="stub-perf -mx-5 my-4" />

      <Row label="Called">
        <span className="font-mono">{lockedOn(lockedAt)}</span>
      </Row>
      <Row label="Standing then">
        {tier ? TIER_SHORT[tier] : "Not recorded yet"}
      </Row>
      <Row label="Season left">
        {left === null ? (
          <span className="font-mono">—</span>
        ) : (
          <span className="flex items-center justify-end gap-2">
            {/* Square-ended, like every bar on this site (§5.4). */}
            <span aria-hidden className="flex h-1.5 w-16 bg-glass-strong">
              <span
                className="block h-full"
                style={{ width: `${left}%`, background: color }}
              />
            </span>
            <span className="font-mono tabular-nums">{left}%</span>
          </span>
        )}
      </Row>

      <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <span className="font-mono text-[0.6rem] tracking-[0.16em] text-ink-mute uppercase">
          {settled ? "Banked" : "Worth"}
        </span>
        <span
          className="font-mono text-2xl font-semibold tabular-nums"
          style={{ color: worth === null && !settled ? undefined : color }}
        >
          {settled ? "✓" : worth === null ? "—" : `+${formatPoints(worth)}`}
        </span>
      </div>
    </article>
  );
}
