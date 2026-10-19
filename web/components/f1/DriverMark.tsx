import type { DriverRef } from "@/lib/f1/types";

/**
 * A driver in a line of the `/f1` tables: the constructor rule, then the name.
 *
 * The site's driver atom (DESIGN §7.6) without the portrait — these tables are
 * twenty-two rows of six columns, and a photo per row is the weight the
 * championship's title fight spends where it means something. The rule is
 * square-ended (§5.4) and `aria-hidden`: the team is printed beside it
 * wherever there is room, so the colour is never the only channel.
 */
export default function DriverMark({
  driver,
  full = false,
  className = "",
}: {
  driver: DriverRef;
  /** First name too — for a table with the width to spare. */
  full?: boolean;
  className?: string;
}) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="h-3.5 w-0.5 shrink-0"
        style={{ background: driver.color }}
      />
      <span className="truncate">
        {full && driver.firstName ? (
          <>
            <span className="hidden sm:inline">{driver.firstName} </span>
            {driver.lastName}
          </>
        ) : (
          driver.lastName
        )}
      </span>
    </span>
  );
}
