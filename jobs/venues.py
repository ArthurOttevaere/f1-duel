"""Where FastF1's calendar is wrong about where a Grand Prix is run.

The schedule sync writes FastF1's `Location` and `Country` into `races`, and
the trace job keys every circuit by that same `Location`. Both read through
here, so a correction is made once and the calendar, the hero's circuit and
the trace file can never disagree about the venue.
"""

from __future__ import annotations

# FastF1 location → (circuit, country) as the site shows them.
VENUE_FIX: dict[str, tuple[str, str]] = {
    # The 2026 Bahrain Grand Prix — round 16 — was moved to Sepang after the
    # conflict in the Middle East cancelled Sakhir in April. It keeps its name,
    # so FastF1 files it under country "Bahrain" and location "Kuala Lumpur",
    # its old label for Sepang. The track is Sepang, in Malaysia; the name
    # stays "Bahrain Grand Prix" because that is what F1 calls it.
    "Kuala Lumpur": ("Sepang", "Malaysia"),
}


def venue(location: str, country: str) -> tuple[str, str]:
    """The (circuit, country) a FastF1 event is actually run at."""
    return VENUE_FIX.get(location, (location, country))
