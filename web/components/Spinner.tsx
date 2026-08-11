/**
 * The one spinner every waiting control uses.
 *
 * Sized in `em` and coloured with `currentColor`, so it inherits whatever it is
 * dropped into — white on a red button, dim grey next to muted text — and never
 * needs a variant. The house rule it exists for: nothing waits in silence. Any
 * control that fires off work shows this until the work comes back.
 *
 * It is decorative on its own; the label beside it is what a screen reader
 * reads. Pass `label` only when the spinner stands alone.
 */
export default function Spinner({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <>
      <span aria-hidden className={`spinner ${className}`} />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
