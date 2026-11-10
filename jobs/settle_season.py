"""Season finale: award championship-pick bonuses (docs/GAME_DESIGN.md §2.3).

Nobody has to run this. `score_race.py` calls `settle()` at the end of every
scheduled pass, and it does nothing until two things are true:

  1. every Grand Prix of the season is `scored`;
  2. Jolpica's driver *and* constructor standings both stand after the last
     round — it publishes them hours after the flag, and settling on the
     table of the round before would pay the wrong champion in a year the
     title is decided at the finale.

The first pass that finds both pays every pick, and that is also what opens
the season recap on the site (`web/lib/recap.ts#seasonState`). Later passes —
the scoring job re-scores for ten days — recompute and write only what changed.

By hand, when wanted:

    python jobs/settle_season.py <season>             # same guards as the job
    python jobs/settle_season.py <season> --dry-run   # print, write nothing
    python jobs/settle_season.py <season> --dry-run --force
                                                      # ignore the guards: what
                                                      # would be paid if the
                                                      # season ended today

Bonus = tier value (by the pick's championship rank at lock time) × prorate
(fraction of the season remaining at lock, floor 20%). Idempotent: rows with
awarded_points already set are recomputed, not double-counted.
"""

from __future__ import annotations

import argparse

import requests

import db
import mailer

DRIVER_TIERS = {1: 50.0, 2: 75.0, 3: 75.0}    # rank at lock -> bonus; P4+ below
DRIVER_OUTSIDER = 150.0
TEAM_TIERS = {1: 30.0, 2: 50.0, 3: 50.0}
TEAM_OUTSIDER = 90.0


def _champions(season: int) -> tuple[str, str, int]:
    """The champions, and the round the *older* of the two tables stands after."""
    base = f"https://api.jolpi.ca/ergast/f1/{season}"
    d = requests.get(f"{base}/driverstandings.json", timeout=30).json()
    c = requests.get(f"{base}/constructorstandings.json", timeout=30).json()
    d_table = d["MRData"]["StandingsTable"]["StandingsLists"][0]
    c_table = c["MRData"]["StandingsTable"]["StandingsLists"][0]
    as_of = min(int(d_table.get("round", 0)), int(c_table.get("round", 0)))
    return (
        d_table["DriverStandings"][0]["Driver"]["driverId"],
        c_table["ConstructorStandings"][0]["Constructor"]["name"],
        as_of,
    )


def settle(season: int, dry_run: bool = False, force: bool = False) -> bool:
    """Pay the season's championship picks if the season is really over.

    Returns True when the picks were (or, dry, would have been) settled.
    """
    races = db.select("races", {"season": f"eq.{season}"})
    if not races:
        print(f"settle {season}: no races on the calendar — nothing to settle")
        return False
    open_rounds = sorted(r["round"] for r in races if r["status"] != "scored")
    last_round = max(r["round"] for r in races)

    if open_rounds and not force:
        # The ordinary case, forty-odd weeks a year: say nothing.
        return False

    champ_driver, champ_team, as_of = _champions(season)
    if as_of < last_round and not force:
        print(f"settle {season}: every race is scored, but the championship "
              f"table still stands after round {as_of} of {last_round} — "
              f"waiting for the final one")
        return False

    tag = "[dry run] " if dry_run else ""
    print(f"{tag}{season} champions (after round {as_of}): "
          f"{champ_driver} / {champ_team}")

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
        awarded = round(points, 1)
        before = pick["awarded_points"]
        unchanged = before is not None and float(before) == awarded
        if not dry_run and not unchanged:
            db.update(
                "season_picks",
                {"user_id": f"eq.{pick['user_id']}", "season": f"eq.{season}"},
                {"awarded_points": awarded},
            )
        if dry_run or not unchanged:
            print(f"  {tag}{pick['user_id'][:8]}…  {pick['champion_driver']} / "
                  f"{pick['champion_team']}  ->  +{awarded:.1f}")

    # The picks are paid, so the recap is open on the site: tell the players.
    # Not on a forced run — that is a what-if on a season still running, and
    # the page it would point at does not exist.
    if not force:
        try:
            announce(season, dry_run=dry_run)
        except Exception as exc:  # noqa: BLE001 — retried on the next pass
            print(f"settle {season}: recap mail failed, will retry — {exc}")
    return True


def season_summaries(season: int) -> tuple[dict | None, dict[str, dict]]:
    """The season's last race, and each player's year in five numbers."""
    races = db.select("races", {"season": f"eq.{season}"})
    if not races:
        return None, {}
    last_race = max(races, key=lambda r: r["round"])
    ids = ",".join(str(r["id"]) for r in races)
    awarded = {p["user_id"]: p["awarded_points"]
               for p in db.select("season_picks", {"season": f"eq.{season}"})}
    out: dict[str, dict] = {}
    for s in db.select("scores", {"race_id": f"in.({ids})",
                                  "select": "user_id,total,beat_model,drew_model"}):
        mine = out.setdefault(s["user_id"], {"won": 0, "drawn": 0, "lost": 0,
                                             "points": 0.0, "awarded": None})
        key = "won" if s["beat_model"] else "drawn" if s["drew_model"] else "lost"
        mine[key] += 1
        mine["points"] = round(mine["points"] + float(s["total"]), 1)
    for user_id, mine in out.items():
        paid = awarded.get(user_id)
        mine["awarded"] = None if paid is None else float(paid)
    return last_race, out


def announce(season: int, dry_run: bool = False, force: bool = False,
             only_to: str | None = None) -> int:
    """Mail everyone who raced that their recap is open. Once each (email_log)."""
    last_race, seasons = season_summaries(season)
    if not last_race or not seasons:
        return 0
    return mailer.send_recap_emails(season, last_race, seasons, force=force,
                                    dry_run=dry_run, only_to=only_to)


def main() -> None:
    p = argparse.ArgumentParser(description="Pay the season's championship picks.")
    p.add_argument("season", type=int)
    p.add_argument("--dry-run", action="store_true",
                   help="compute and print; write nothing")
    p.add_argument("--force", action="store_true",
                   help="ignore the 'season is over' guards (dry runs only)")
    args = p.parse_args()
    if args.force and not args.dry_run:
        raise SystemExit("--force only goes with --dry-run: paying a season "
                         "that is still running would open the recap early.")
    if not settle(args.season, dry_run=args.dry_run, force=args.force):
        print(f"settle {args.season}: not settled (season still running, or "
              f"the final standings are not published yet)")


if __name__ == "__main__":
    main()
