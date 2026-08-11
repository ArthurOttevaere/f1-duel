"""Operator console: the model's season score, and the player list.

Everything here is a thin wrapper over the operator-only SQL functions of
`supabase/migrations/0006_admin_controls.sql`, so the terminal and the Supabase
SQL editor do exactly the same thing — there is one definition of each action
and it lives in the database.

    export SUPABASE_URL=https://<project>.supabase.co
    export SUPABASE_SERVICE_KEY=<service_role secret>

    python jobs/admin.py model-status                # what counts, race by race
    python jobs/admin.py model-reset                 # the model's total -> 0
    python jobs/admin.py model-count-from 15         # the season starts at r15
    python jobs/admin.py model-restore               # undo: it all counts again
    python jobs/admin.py players                     # everyone, with their points
    python jobs/admin.py delete-player <username>    # remove a player for good

Why the model needs this at all: it plays every Grand Prix whether or not
anyone else is on the platform, so on launch day it has a season of points and
every human has none. A reset drops the races it has already been scored on
from its *season total only* — every race page still shows what it really
scored, and every duel result stands. `--season` defaults to the current year.
"""

from __future__ import annotations

import argparse
import datetime as dt

import db


# ─── Reading ────────────────────────────────────────────────────────────────

def model_status(season: int) -> None:
    rows = db.rpc("admin_model_status", {"p_season": season}) or []
    if not rows:
        raise SystemExit(f"No races for {season} — has sync_schedule.py run?")

    print(f"{'R':>3}  {'Race':<28} {'status':<10} {'model':>8}  counts")
    print("─" * 64)
    counted = dropped = 0
    total = 0.0
    for r in rows:
        score = r["model_total"]
        if score is None:
            mark = "—"
        elif r["counts_in_standings"]:
            mark = "yes"
            counted += 1
            total += float(score)
        else:
            mark = "no"
            dropped += 1
        print(f"{r['round']:>3}  {r['race'][:28]:<28} {r['status']:<10} "
              f"{'—' if score is None else format(float(score), '.1f'):>8}  {mark}")

    print("─" * 64)
    print(f"Season total: {total:.1f} from {counted} race(s)"
          + (f", {dropped} dropped" if dropped else ""))
    if dropped:
        print("Run `model-restore` to count the whole season again.")


def players(_: int) -> None:
    rows = db.rpc("admin_players") or []
    if not rows:
        print("No players yet.")
        return
    print(f"{'username':<22} {'email':<32} {'races':>5} {'points':>8}  joined")
    print("─" * 86)
    for p in rows:
        pts = p["points"]
        print(f"{(p['username'] or '')[:22]:<22} {(p['email'] or '—')[:32]:<32} "
              f"{p['races_played'] or 0:>5} "
              f"{0.0 if pts is None else float(pts):>8.1f}  "
              f"{(p['created_at'] or '')[:10]}")
    print(f"\n{len(rows)} player(s).")


# ─── Writing ────────────────────────────────────────────────────────────────

def confirm(question: str, assume_yes: bool) -> bool:
    """A y/N prompt, skipped with --yes (which is what CI would need)."""
    if assume_yes:
        return True
    return input(f"{question} [y/N] ").strip().lower() in {"y", "yes"}


def model_reset(season: int, assume_yes: bool) -> None:
    before = db.rpc("model_season_points", {"p_season": season})
    print(f"The model is on {float(before or 0):.1f} points for {season}.")
    if not confirm("Drop every race it has been scored on from its season "
                   "total?", assume_yes):
        raise SystemExit("Nothing changed.")
    n = db.rpc("admin_model_reset", {"p_season": season})
    after = db.rpc("model_season_points", {"p_season": season})
    print(f"{n} race(s) dropped. The model now shows {float(after or 0):.1f} "
          f"and starts collecting again at the next Grand Prix.")


def model_count_from(season: int, round_: int, assume_yes: bool) -> None:
    if not confirm(f"Count the model's season from round {round_} onwards "
                   "(everything before stops counting)?", assume_yes):
        raise SystemExit("Nothing changed.")
    n = db.rpc("admin_model_count_from",
               {"p_season": season, "p_round": round_})
    after = db.rpc("model_season_points", {"p_season": season})
    print(f"{n} race(s) changed. The model now shows {float(after or 0):.1f}.")


def model_restore(season: int, assume_yes: bool) -> None:
    if not confirm(f"Count the model's whole {season} season again?", assume_yes):
        raise SystemExit("Nothing changed.")
    n = db.rpc("admin_model_restore", {"p_season": season})
    after = db.rpc("model_season_points", {"p_season": season})
    print(f"{n} race(s) restored. The model now shows {float(after or 0):.1f}.")


def delete_player(username: str, assume_yes: bool) -> None:
    """Remove a player and everything attached to them. There is no undo."""
    rows = db.select("profiles", {"username": f"eq.{username}", "select": "id,username"})
    if not rows:
        # The SQL function is case-insensitive; this lookup isn't, so say so
        # rather than claiming the player doesn't exist.
        raise SystemExit(f"No player named exactly '{username}'. "
                         f"Check `python jobs/admin.py players`.")

    print(f"This deletes {username}: their account, details, every prediction "
          f"and score, their championship pick, league membership, and any "
          f"league they own — for its members too. There is no undo.")
    if not assume_yes:
        typed = input("Type the username to confirm: ").strip()
        if typed != username:
            raise SystemExit("Names don't match. Nothing changed.")

    uid = db.rpc("admin_delete_player", {"p_username": username})
    print(f"Deleted {username} ({uid}).")


# ─── CLI ────────────────────────────────────────────────────────────────────

def main() -> None:
    # The two shared flags are attached to the top-level parser *and* to every
    # subcommand, so `admin.py --season 2025 model-reset` and
    # `admin.py model-reset --season 2025` both work — nobody should have to
    # remember which side of the verb a flag belongs on.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--season", type=int, default=dt.date.today().year,
                        help="season to act on (default: this year)")
    common.add_argument("--yes", action="store_true",
                        help="skip the confirmation prompt")

    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
        parents=[common],
    )
    sub = parser.add_subparsers(dest="command", required=True)

    def command(name: str, help_: str) -> argparse.ArgumentParser:
        return sub.add_parser(name, help=help_, parents=[common])

    command("model-status", "round-by-round: scored, and counting?")
    command("model-reset", "the model's season total -> 0")
    from_cmd = command("model-count-from",
                       "count the model's season from this round on")
    from_cmd.add_argument("round", type=int)
    command("model-restore", "count the model's whole season again")
    command("players", "every player, with points and email")
    del_cmd = command("delete-player", "remove a player for good")
    del_cmd.add_argument("username")

    args = parser.parse_args()

    if args.command == "model-status":
        model_status(args.season)
    elif args.command == "players":
        players(args.season)
    elif args.command == "model-reset":
        model_reset(args.season, args.yes)
    elif args.command == "model-count-from":
        model_count_from(args.season, args.round, args.yes)
    elif args.command == "model-restore":
        model_restore(args.season, args.yes)
    elif args.command == "delete-player":
        delete_player(args.username, args.yes)


if __name__ == "__main__":
    main()
