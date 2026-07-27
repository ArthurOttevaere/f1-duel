"""Hourly on race weekends: refresh the model's duel entry, lock at race start.

Run:  python jobs/lock_race.py

For the upcoming race (once qualifying should be over), runs the model and
upserts its entry — order + probability matrix — so the entry on record is
always the freshest pre-race one. At race start the race flips to 'locked':
player predictions close (enforced by RLS) and the model entry is frozen.

Fallback per docs §2.2: if the model never produced an entry by lock time,
the qualifying order becomes the model entry with no probabilities (all
rarity multipliers ×1). The duel always happens.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import db
import model_bridge
import scoring  # noqa: F401  (kept close: scoring reads the matrix written here)


def _dt(v: str | None):
    return datetime.fromisoformat(v) if v else None


def refresh_entry(race: dict) -> bool:
    try:
        entry = model_bridge.model_entry(race["season"], race["round"])
    except Exception as e:
        print(f"round {race['round']}: model unavailable ({e})")
        return False
    db.upsert("model_entries", {
        "race_id": race["id"],
        "predicted_order": entry["predicted_order"],
        "prob_matrix": entry["prob_matrix"],
        "pre_quali": entry["pre_quali"],
        "locked_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="race_id")
    mode = "pre-quali" if entry["pre_quali"] else "post-quali"
    print(f"round {race['round']}: model entry refreshed ({mode})")
    return True


def grid_fallback(race: dict) -> None:
    quali = model_bridge.model.load_qualifying(race["season"], race["round"])
    order = [str(d) for d in quali["DriverId"]] if quali is not None else []
    if not order:
        print(f"round {race['round']}: NO fallback available — left unlocked")
        return
    db.upsert("model_entries", {
        "race_id": race["id"],
        "predicted_order": order,
        "prob_matrix": {},
        "pre_quali": False,
        "locked_at": datetime.now(timezone.utc).isoformat(),
    }, on_conflict="race_id")
    print(f"round {race['round']}: grid-order fallback entry stored")


def main() -> None:
    now = datetime.now(timezone.utc)
    races = db.select("races", {"status": "eq.scheduled",
                                "race_at": "not.is.null",
                                "order": "race_at.asc"})
    for race in races:
        race_at = _dt(race["race_at"])
        quali_at = _dt(race["quali_at"])
        if race_at > now + timedelta(days=3):
            break  # only the imminent weekend matters

        if now < race_at:
            # Entry becomes worth refreshing once qualifying should be done.
            if quali_at is None or now > quali_at + timedelta(hours=1, minutes=30):
                refresh_entry(race)
        else:
            # Race has started: freeze whatever we have and lock.
            existing = db.select("model_entries", {"race_id": f"eq.{race['id']}"})
            if not existing and not refresh_entry(race):
                grid_fallback(race)
            db.update("races", {"id": f"eq.{race['id']}"}, {"status": "locked"})
            print(f"round {race['round']}: LOCKED")


if __name__ == "__main__":
    main()
