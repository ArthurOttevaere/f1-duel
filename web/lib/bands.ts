/**
 * The one sequential scale in the system, and the game rule it draws.
 *
 * Colour intensity is the model's confidence; the multiplier runs the other
 * way, so **the pale end is where the points are** (DESIGN §3.4, §1.1). The
 * stops are not a designer's ramp — they are the rarity tiers of
 * `GAME_DESIGN.md` §2.2, which is why the matrix on `/model` and the rule on
 * `/rules` can be the same picture.
 *
 * It lived inside `ProbabilityGrid` until `/rules` needed to draw the rule
 * with the chart's own colours. Two consumers, one definition: a tier that
 * changes in the game has exactly one place to change here.
 */

/**
 * Probability floor, then the tier it falls in. Highest band first.
 *
 * Text sits *on top of* its own fill wherever these are used, so the contrast
 * was checked rather than guessed: the strongest fill composites to about
 * #e11b36 on this surface, which is 4.9:1 against #f4f6fa and only 4.0:1
 * against the page black — the "obvious" dark-text treatment for a bright band
 * is the worse one here, and the middle band (#8f1426) is not close: 10:1
 * light, 1.9:1 dark. Everything on a band is light ink for that reason, at
 * every band.
 */
export const BANDS = [
  { min: 0.3, mult: "×1", fill: "rgb(255 30 60 / 0.88)" },
  { min: 0.15, mult: "×1.5", fill: "rgb(255 30 60 / 0.55)" },
  { min: 0.05, mult: "×2", fill: "rgb(255 30 60 / 0.3)" },
  { min: 0.02, mult: "×3", fill: "rgb(255 30 60 / 0.14)" },
  { min: 0, mult: "×3", fill: "rgb(255 255 255 / 0.03)" },
] as const;

export const bandFor = (p: number) =>
  BANDS.find((b) => p >= b.min) ?? BANDS[BANDS.length - 1];

/**
 * The rule as the player meets it: **four** steps, not five. The fifth band
 * above is a shade — under 2% the matrix goes almost to nothing so a flat
 * field does not read as ten identical stubs — but it pays the same ×3 as the
 * one above it, and a rule that lists two identical payouts is a rule nobody
 * finishes reading.
 */
export const RARITY_TIERS = [
  {
    range: "30% and up",
    note: "A favourite. The model called it too.",
    mult: BANDS[0].mult,
    fill: BANDS[0].fill,
  },
  {
    range: "15 – 30%",
    note: "Likely, but not the obvious name.",
    mult: BANDS[1].mult,
    fill: BANDS[1].fill,
  },
  {
    range: "5 – 15%",
    note: "An outside call, and a read the model didn't make.",
    mult: BANDS[2].mult,
    fill: BANDS[2].fill,
  },
  {
    range: "under 5%",
    note: "A long shot. This is where duels are won.",
    mult: BANDS[3].mult,
    fill: BANDS[3].fill,
  },
] as const;
