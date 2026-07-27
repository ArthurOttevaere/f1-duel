"""Backtest the F1 Duel scoring rules on already-run races. Local only, no DB.

Run:  python jobs/backtest.py [season] [--rounds 1-13]

For each past race: runs the model (post-quali), builds the probability
matrix, scores the model and a set of archetype players against the official
classification. Validates that the rules in docs/GAME_DESIGN.md §2.2 "feel"
right before any UI exists:

  mirror      copies the model exactly       -> must tie every race (+draw bonus)
  grid        predicts the starting grid     -> the lazy baseline
  bold        model's order with brave calls -> should beat the model when they land
  chaos       podium reversed + backmarker punt -> high variance, usually loses
"""

from __future__ import annotations

import argparse

import model_bridge
import scoring


def archetypes(entry: dict, grid_order: list[str]) -> dict[str, list[str]]:
    m = entry["predicted_order"]
    top10 = m[:10]

    # bold: swap P1/P2, swap P5/P6, promote the model's P11 to P9.
    bold = list(top10)
    bold[0], bold[1] = bold[1], bold[0]
    if len(bold) > 5:
        bold[4], bold[5] = bold[5], bold[4]
    if len(m) > 10:
        bold[8] = m[10]

    # chaos: podium reversed, P10 given to the model's P14.
    chaos = list(top10)
    chaos[0], chaos[2] = chaos[2], chaos[0]
    if len(m) > 13:
        chaos[9] = m[13]

    players = {"mirror": top10, "bold": bold, "chaos": chaos}
    if grid_order:
        players["grid"] = grid_order[:10]
    return players


def run(season: int, rounds: list[int]) -> None:
    season_totals: dict[str, float] = {}
    duel_record: dict[str, list[int]] = {}

    for rnd in rounds:
        classification = model_bridge.actual_classification(season, rnd)
        if not classification:
            print(f"round {rnd:>2}: no results, skipped")
            continue
        try:
            entry = model_bridge.model_entry(season, rnd)
        except Exception as e:
            print(f"round {rnd:>2}: model failed ({e}), skipped")
            continue

        df, *_ = model_bridge.model.predict(season, rnd)
        grid = (df.dropna(subset=["GridPosition"])
                  .sort_values("GridPosition")["DriverId"].astype(str).tolist())

        model_table = scoring.score_table(entry["predicted_order"][:10],
                                          classification, entry["prob_matrix"])
        line = [f"round {rnd:>2} [{entry['event_name'][:24]:<24}]",
                f"model {model_table['total']:6.1f}"]
        season_totals["model"] = season_totals.get("model", 0) + model_table["total"]

        for name, picks in archetypes(entry, grid).items():
            table = scoring.score_table(picks, classification, entry["prob_matrix"])
            final = scoring.finalize(table, None, None, model_table["total"])
            season_totals[name] = season_totals.get(name, 0) + final["total"]
            rec = duel_record.setdefault(name, [0, 0, 0])
            rec[0 if final["beat_model"] else (1 if final["drew_model"] else 2)] += 1
            flag = "W" if final["beat_model"] else ("D" if final["drew_model"] else "L")
            line.append(f"{name} {final['total']:6.1f} {flag}")
        print("  ".join(line))

    print("\n=== season totals ===")
    for name, total in sorted(season_totals.items(), key=lambda x: -x[1]):
        rec = duel_record.get(name)
        rec_s = f"  duel W-D-L {rec[0]}-{rec[1]}-{rec[2]}" if rec else ""
        print(f"{name:>7}: {total:8.1f}{rec_s}")


def parse_rounds(spec: str) -> list[int]:
    if "-" in spec:
        a, b = spec.split("-")
        return list(range(int(a), int(b) + 1))
    return [int(x) for x in spec.split(",")]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("season", nargs="?", type=int, default=2026)
    ap.add_argument("--rounds", default="1-13")
    args = ap.parse_args()
    run(args.season, parse_rounds(args.rounds))
