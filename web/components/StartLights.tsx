/**
 * The five-light gantry, in two modes.
 *
 * **Running** (no `lit`) — five columns of two bulbs light up left to right,
 * hold, then all go out at once: the one moment every F1 session starts with.
 * That blackout is the point. A spinner that goes round forever says "still
 * waiting", while lights out says "go", which is what the site is about to do.
 *
 * **Driven** (`lit` given) — the same gantry with the loop switched off and
 * the count in somebody else's hands. `Countdown` lights it as the last hour
 * falls, so the clock reads as a start procedure instead of as a launch-page
 * timer: five on, then the blackout is the lock.
 *
 * Pure CSS and pure markup on purpose (`.sl-*` in globals.css): the boot screen
 * renders this in the server HTML and it has to animate before any JavaScript
 * arrives. No hooks, no client boundary.
 */
export default function StartLights({
  className = "",
  lit,
}: {
  className?: string;
  /** 0–5. Given, the gantry stops cycling and holds this many lights. */
  lit?: number;
}) {
  const driven = typeof lit === "number";
  const on = Math.max(0, Math.min(5, lit ?? 0));

  return (
    <span
      aria-hidden
      className={`start-lights ${driven ? "start-lights--driven" : ""} ${className}`}
    >
      {[0, 1, 2, 3, 4].map((col) => (
        <span
          key={col}
          className={`sl-col ${driven && col < on ? "sl-col--on" : ""}`}
        >
          <span className="sl-bulb" />
          <span className="sl-bulb" />
        </span>
      ))}
    </span>
  );
}
