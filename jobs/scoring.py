"""Pure scoring engine for F1 Duel.

Implements docs/GAME_DESIGN.md §2.2 exactly. No I/O, no dependencies beyond
the standard library: both the scoring job and the backtest import from here,
so the rules live in one place.

A "table" is the score of an ordered top-10 prediction against the official
classification. Players and the model are scored with the same function; the
Driver-of-the-Day and duel bonuses only exist for players and are applied in
`finalize()`.
"""

from __future__ import annotations

BASE_EXACT = 10.0     # driver at the exact predicted position
BASE_NEAR = 5.0       # driver within ±1 of the predicted position
BASE_IN_TOP10 = 2.0   # driver elsewhere inside the actual top 10

BONUS_PODIUM = 15.0   # P1-P2-P3 all exact
BONUS_PERFECT = 100.0 # all ten exact
BONUS_DOTD = 5.0      # correct Driver of the Day vote (players only)
BONUS_SAFETY_CAR = 8.0  # correct safety-car (SC/VSC) side bet — model bets too
BONUS_BEAT_MODEL = 10.0
BONUS_DRAW_MODEL = 3.0

# Rarity tiers: model probability of that exact placement -> multiplier.
RARITY_TIERS = ((0.30, 1.0), (0.15, 1.5), (0.05, 2.0))
RARITY_MAX = 3.0


def rarity_multiplier(p: float | None) -> float:
    """Multiplier for an exact hit, from the model's frozen probability.

    `None` (no probability available, e.g. grid-order fallback entry) means
    no multiplier: base points only.
    """
    if p is None:
        return 1.0
    for threshold, mult in RARITY_TIERS:
        if p >= threshold:
            return mult
    return RARITY_MAX


def sc_bonus(bet: bool | None, actual: bool | None) -> float:
    """Points for the safety-car side bet — awarded to whoever calls it right.

    `bet` is the Yes/No prediction (None = no bet placed), `actual` is whether a
    safety car was deployed (None = outcome unknown/unavailable → no points).
    """
    if bet is None or actual is None:
        return 0.0
    return BONUS_SAFETY_CAR if bool(bet) == bool(actual) else 0.0


def _prob_at(prob_matrix: dict | None, driver: str, position: int) -> float | None:
    if not prob_matrix:
        return None
    probs = prob_matrix.get(driver)
    if not probs or len(probs) < position:
        return None
    return float(probs[position - 1])


def score_table(picks: list[str], classification: dict[str, int],
                prob_matrix: dict | None) -> dict:
    """Score an ordered top-10 against the official classification.

    picks           ordered driver_ids, index 0 = predicted winner
    classification  {driver_id: official finish position}
    prob_matrix     {driver_id: [p_pos1, p_pos2, …]} frozen at lock, or None

    Returns {"slots": [...], "bonuses": {...}, "total": float} — everything
    needed to display the per-slot breakdown in the UI.
    """
    slots = []
    exact_hits = 0
    podium_hits = 0
    total = 0.0

    for i, driver in enumerate(picks[:10]):
        predicted = i + 1
        actual = classification.get(driver)
        p = _prob_at(prob_matrix, driver, predicted)
        mult = 1.0

        if actual == predicted:
            kind, base = "exact", BASE_EXACT
            mult = rarity_multiplier(p)
            exact_hits += 1
            if predicted <= 3:
                podium_hits += 1
        elif actual is not None and abs(actual - predicted) == 1:
            kind, base = "near", BASE_NEAR
        elif actual is not None and actual <= 10:
            kind, base = "in_top10", BASE_IN_TOP10
        else:
            kind, base = "miss", 0.0

        points = base * mult
        total += points
        slots.append({
            "position": predicted,
            "driver": driver,
            "actual": actual,
            "kind": kind,
            "base": base,
            "probability": p,
            "multiplier": mult,
            "points": points,
        })

    bonuses = {"podium": 0.0, "perfect": 0.0}
    if podium_hits == 3:
        bonuses["podium"] = BONUS_PODIUM
    if exact_hits == 10:
        bonuses["perfect"] = BONUS_PERFECT
    total += bonuses["podium"] + bonuses["perfect"]

    return {"slots": slots, "bonuses": bonuses, "total": total}


def finalize(table: dict, dotd_pick: str | None, dotd_actual: str | None,
             model_total: float | None, sc_bet: bool | None = None,
             sc_actual: bool | None = None) -> dict:
    """Apply the player bonuses (DotD, safety-car bet, duel) on top of a table.

    The duel is decided on the player's table + DotD + safety-car total versus
    the model's table + its own safety-car total (`model_total` already includes
    it). Returns the full breakdown to persist in scores.breakdown.
    """
    bonuses = dict(table["bonuses"])
    bonuses["dotd"] = (
        BONUS_DOTD if dotd_pick and dotd_actual and dotd_pick == dotd_actual
        else 0.0
    )
    bonuses["safety_car"] = sc_bonus(sc_bet, sc_actual)

    comparable = table["total"] + bonuses["dotd"] + bonuses["safety_car"]
    beat_model = drew_model = False
    bonuses["duel"] = 0.0
    if model_total is not None:
        if comparable > model_total:
            beat_model = True
            bonuses["duel"] = BONUS_BEAT_MODEL
        elif comparable == model_total:
            drew_model = True
            bonuses["duel"] = BONUS_DRAW_MODEL

    return {
        "slots": table["slots"],
        "bonuses": bonuses,
        "dotd_pick": dotd_pick,
        "sc_bet": sc_bet,
        "model_total": model_total,
        "total": comparable + bonuses["duel"],
        "beat_model": beat_model,
        "drew_model": drew_model,
    }
