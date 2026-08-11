/**
 * The five-light gantry, running its sequence on a loop.
 *
 * Five columns of two bulbs light up left to right, hold, then all go out at
 * once — the one moment every F1 session starts with. That blackout is the
 * point: a spinner that goes round forever says "still waiting", while lights
 * out says "go", which is what the site is about to do.
 *
 * Pure CSS and pure markup on purpose (`.sl-*` in globals.css): the boot screen
 * renders this in the server HTML and it has to animate before any JavaScript
 * arrives. No hooks, no client boundary.
 */
export default function StartLights({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`start-lights ${className}`}>
      {[0, 1, 2, 3, 4].map((col) => (
        <span key={col} className="sl-col">
          <span className="sl-bulb" />
          <span className="sl-bulb" />
        </span>
      ))}
    </span>
  );
}
