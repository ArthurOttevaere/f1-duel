"""Safety-Car side bet — the model's opinion.

Per docs/GAME_DESIGN.md §2.6: alongside the top 10, each player bets whether a
safety car (full **or** virtual) will be deployed during the race. The model
bets too, so the bet is part of the head-to-head duel.

The model has no live safety-car signal, so it plays the historical rate: how
often a given circuit sees at least one SC/VSC deployment. Rates are grouped
into broad tiers from public F1 history (street/high-chaos circuits are far more
likely than smooth permanent tracks). The model bets "yes" when that rate is at
least 50 %. This is deliberately simple and static — a human beats it by reading
the specific weekend (weather, grid tension, rookies) the way rarity multipliers
reward reading a specific race.
"""

from __future__ import annotations

# Circuit keyword -> P(at least one SC or VSC). Matched case-insensitively
# against the race name / circuit / country, longest logic first.
_HIGH = 0.85   # street & chaos circuits
_MED = 0.60    # busy but permanent
_LOW = 0.45    # smooth, low-incident permanent
DEFAULT_RATE = 0.55

_CIRCUIT_RATES: dict[str, float] = {
    # High — narrow, walled, safety-car magnets.
    "monaco": _HIGH,
    "singapore": _HIGH,
    "marina bay": _HIGH,
    "azerbaijan": _HIGH,
    "baku": _HIGH,
    "saudi": _HIGH,
    "jeddah": _HIGH,
    "australia": _HIGH,
    "albert park": _HIGH,
    "melbourne": _HIGH,
    "miami": _HIGH,
    "las vegas": _HIGH,
    "canada": _HIGH,
    "canadian": _HIGH,
    "montreal": _HIGH,
    "gilles villeneuve": _HIGH,
    # Medium — frequent but not guaranteed.
    "netherlands": _MED,
    "dutch": _MED,
    "zandvoort": _MED,
    "qatar": _MED,
    "lusail": _MED,
    "britain": _MED,
    "british": _MED,
    "silverstone": _MED,
    "hungary": _MED,
    "hungarian": _MED,
    "hungaroring": _MED,
    "emilia": _MED,
    "imola": _MED,
    "belgian": _MED,
    "belgium": _MED,
    "spa": _MED,
    "brazil": _MED,
    "interlagos": _MED,
    "sao paulo": _MED,
    "são paulo": _MED,
    "mexico": _MED,
    "united states": _MED,
    "austin": _MED,
    "cota": _MED,
    # Low — smooth, wide run-off, few stoppages.
    "japan": _LOW,
    "japanese": _LOW,
    "suzuka": _LOW,
    "spain": _LOW,
    "spanish": _LOW,
    "barcelona": _LOW,
    "catalunya": _LOW,
    "austria": _LOW,
    "austrian": _LOW,
    "red bull ring": _LOW,
    "bahrain": _LOW,
    "sakhir": _LOW,
    "abu dhabi": _LOW,
    "yas marina": _LOW,
    "china": _LOW,
    "chinese": _LOW,
    "shanghai": _LOW,
    "italy": _LOW,
    "italian": _LOW,
    "monza": _LOW,
}


def circuit_rate(*fields: str | None) -> float:
    """Historical P(SC or VSC) for a race, from any of its text fields."""
    haystack = " ".join(f.lower() for f in fields if f)
    for keyword, rate in _CIRCUIT_RATES.items():
        if keyword in haystack:
            return rate
    return DEFAULT_RATE


def model_bet(*fields: str | None) -> tuple[float, bool]:
    """(probability, bet) — the model bets 'yes' at 50 % or higher."""
    prob = circuit_rate(*fields)
    return prob, prob >= 0.5
