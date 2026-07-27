"""Hourly after a race: fetch the classification and score the duel.

Run:  python jobs/score_race.py

Idempotent: safe to re-run any number of times. Locked races are scored as
soon as FastF1 has the official classification; recently-scored races are
re-scored so a Driver-of-the-Day entered later (jobs/set_dotd.py) is picked
up on the next pass. The official classification at scoring time is final.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import db
import model_bridge
import scoring


def score_race(race: dict) -> bool:
    now = datetime.now(timezone.utc)
    race_at = datetime.fromisoformat(race["race_at"])
    if now < race_at + timedelta(hours=2):
        return False  # race not plausibly finished yet

    classification = model_bridge.actual_classification(race["season"], race["round"])
    if not classification:
        print(f"round {race['round']}: no official classification yet")
        return False

    entries = db.select("model_entries", {"race_id": f"eq.{race['id']}"})
    if not entries:
        print(f"round {race['round']}: no model entry — run lock_race first")
        return False
    entry = entries[0]
    prob_matrix = entry["prob_matrix"] or None

    existing = db.select("results", {"race_id": f"eq.{race['id']}"})
    dotd = existing[0]["dotd"] if existing else None

    model_table = scoring.score_table(entry["predicted_order"][:10],
                                      classification, prob_matrix)
    db.upsert("model_entries", {
        "race_id": race["id"],
        "predicted_order": entry["predicted_order"],
        "prob_matrix": entry["prob_matrix"],
        "pre_quali": entry["pre_quali"],
        "total": model_table["total"],
        "breakdown": model_table,
    }, on_conflict="race_id")

    predictions = db.select("predictions", {"race_id": f"eq.{race['id']}"})
    score_rows = []
    for pred in predictions:
        table = scoring.score_table(pred["picks"], classification, prob_matrix)
        final = scoring.finalize(table, pred["dotd"], dotd, model_table["total"])
        score_rows.append({
            "race_id": race["id"],
            "user_id": pred["user_id"],
            "total": final["total"],
            "breakdown": final,
            "beat_model": final["beat_model"],
            "drew_model": final["drew_model"],
        })
    db.upsert("scores", score_rows, on_conflict="race_id,user_id")

    db.upsert("results", {
        "race_id": race["id"],
        "classification": classification,
        "dotd": dotd,
        "scored_at": now.isoformat(),
    }, on_conflict="race_id")
    db.update("races", {"id": f"eq.{race['id']}"}, {"status": "scored"})
    print(f"round {race['round']}: scored — model {model_table['total']:.1f} pts, "
          f"{len(score_rows)} player(s)")
    return True


def main() -> None:
    now = datetime.now(timezone.utc)
    locked = db.select("races", {"status": "eq.locked"})
    rescore_window = (now - timedelta(days=10)).isoformat()
    recent = db.select("races", {"status": "eq.scored",
                                 "race_at": f"gte.{rescore_window}"})
    for race in locked + recent:
        score_race(race)


if __name__ == "__main__":
    main()
