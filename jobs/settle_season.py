"""Season finale: award championship-pick bonuses (docs/GAME_DESIGN.md §2.3).

Run once after the last race:  python jobs/settle_season.py <season>

Bonus = tier value (by the pick's championship rank at lock time) × prorate
(fraction of the season remaining at lock, floor 20%). Idempotent: rows with
awarded_points already set are recomputed, not double-counted.
"""

from __future__ import annotations

import sys

import requests

import db

DRIVER_TIERS = {1: 50.0, 2: 75.0, 3: 75.0}    # rank at lock -> bonus; P4+ below
DRIVER_OUTSIDER = 150.0
TEAM_TIERS = {1: 30.0, 2: 50.0, 3: 50.0}
TEAM_OUTSIDER = 90.0


def _champions(season: int) -> tuple[str, str]:
    base = f"https://api.jolpi.ca/ergast/f1/{season}"
    d = requests.get(f"{base}/driverstandings.json", timeout=30).json()
    c = requests.get(f"{base}/constructorstandings.json", timeout=30).json()
    d_list = d["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"]
    c_list = c["MRData"]["StandingsTable"]["StandingsLists"][0]["ConstructorStandings"]
    return d_list[0]["Driver"]["driverId"], c_list[0]["Constructor"]["name"]


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    season = int(sys.argv[1])
    champ_driver, champ_team = _champions(season)
    print(f"{season} champions: {champ_driver} / {champ_team}")

    for pick in db.select("season_picks", {"season": f"eq.{season}"}):
        prorate = float(pick["prorate"] or 0.2)
        points = 0.0
        if pick["champion_driver"] == champ_driver:
            rank = pick["driver_rank_at_lock"]
            tier = DRIVER_TIERS.get(rank, DRIVER_OUTSIDER) if rank else DRIVER_OUTSIDER
            points += tier * prorate
        team, champ = pick["champion_team"].casefold(), champ_team.casefold()
        if champ in team or team in champ:
            rank = pick["team_rank_at_lock"]
            tier = TEAM_TIERS.get(rank, TEAM_OUTSIDER) if rank else TEAM_OUTSIDER
            points += tier * prorate
        db.update(
            "season_picks",
            {"user_id": f"eq.{pick['user_id']}", "season": f"eq.{season}"},
            {"awarded_points": round(points, 1)},
        )
        print(f"  {pick['user_id'][:8]}…  {pick['champion_driver']} / "
              f"{pick['champion_team']}  ->  +{points:.1f}")


if __name__ == "__main__":
    main()
