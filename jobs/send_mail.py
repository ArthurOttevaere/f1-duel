"""Send a race email by hand, outside the schedule.

The two race emails normally go out from `lock_race.py` and `score_race.py` on
their crons (docs/GAME_DESIGN.md §2.7). This is the operator's override: the
same templates, the same recipients, the same log — sent when you say so.

    # who would get the Saturday nudge for round 12, sending nothing
    python jobs/send_mail.py lock 12 --dry-run

    # actually send it
    python jobs/send_mail.py lock 12

    # send the results for round 11 again, to everyone
    python jobs/send_mail.py result 11 --force

    # see the template, with no players and no data — goes to one address
    python jobs/send_mail.py result 11 --preview hello@f1-duel.com

    # the season's one mail, "your recap is open" — no round; it goes out by
    # itself when the season is settled (settle_season.py), this is the override
    python jobs/send_mail.py recap --dry-run
    python jobs/send_mail.py recap --preview hello@f1-duel.com

`--force` clears `email_log` for that race and kind, so everyone is owed the
mail again. Without it, anyone already emailed is skipped — which is what makes
re-running safe, and what you are deliberately overriding.

`--to` **filters the player list**; an address belonging to no account matches
nobody and sends nothing. To put the template in front of your own eyes when
there are no players yet — or no scores — use `--preview`, which sends one
copy to any address at all, from real data where it exists and representative
values where it doesn't. A preview is never written to `email_log`.

Needs SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY and MAIL_FROM. Without
the last two every send is a logged no-op, so `--dry-run` is not the only way
to rehearse.
"""

from __future__ import annotations

import argparse
import os
import sys

import db
import mailer
import settle_season

SEASON = int(os.environ.get("SEASON") or os.environ.get("NEXT_PUBLIC_SEASON") or 2026)


def race_for(round_no: int) -> dict:
    rows = db.select("races", {"season": f"eq.{SEASON}", "round": f"eq.{round_no}"})
    if not rows:
        sys.exit(f"No round {round_no} in season {SEASON}.")
    return rows[0]


def send_lock(race: dict, args) -> int:
    entries = db.select("model_entries", {"race_id": f"eq.{race['id']}"})
    if not entries:
        # The mail's whole claim is that the model has played its hand. Sending
        # it before that is true is the one thing this script must not do.
        sys.exit(
            f"Nothing sent. Round {race['round']} has no model entry yet, so "
            f"the nudge — whose whole claim is that the model has played its "
            f"hand — would be untrue. The entry appears about 90 minutes after "
            f"qualifying, and lock-race writes it on its own. Nothing is broken."
        )
    return mailer.send_lock_emails(race, force=args.force, dry_run=args.dry_run,
                                   only_to=args.to)


def send_result(race: dict, args) -> int:
    if race["status"] != "scored":
        sys.exit(f"Nothing sent. Round {race['round']} is "
                 f"'{race['status']}', not scored, so there is no result to "
                 f"report yet. score-race writes it on its own after the race.")

    entries = db.select("model_entries", {"race_id": f"eq.{race['id']}"})
    model_total = (entries[0].get("total") if entries else None)
    if model_total is None:
        sys.exit(f"Round {race['round']}: the model has no total, so there is "
                 f"no margin to report.")

    scores = db.select("scores", {"race_id": f"eq.{race['id']}"})
    if not scores:
        sys.exit(f"Round {race['round']}: nobody has a score for this race.")

    return mailer.send_result_emails(
        race, {s["user_id"]: s for s in scores}, float(model_total),
        force=args.force, dry_run=args.dry_run, only_to=args.to,
    )


PREVIEW_TOKEN = "00000000-0000-0000-0000-000000000000"


def send_recap(args) -> int:
    """The recap mail by hand. Refuses while the page it points at is closed."""
    races = db.select("races", {"season": f"eq.{SEASON}"})
    unpaid = [p for p in db.select("season_picks", {"season": f"eq.{SEASON}"})
              if p["awarded_points"] is None]
    if not args.dry_run and (
            not races or any(r["status"] != "scored" for r in races) or unpaid):
        sys.exit(f"Nothing sent. Season {SEASON} is not settled, so the recap "
                 f"this mail links to is still closed. It goes out by itself "
                 f"the moment it opens.")
    return settle_season.announce(SEASON, dry_run=args.dry_run,
                                  force=args.force, only_to=args.to)


def preview_recap(address: str) -> int:
    """One copy to one address: a real player's season if there is one."""
    _, seasons = settle_season.season_summaries(SEASON)
    mine = max(seasons.values(), key=lambda s: s["points"]) if seasons else {
        "won": 7, "drawn": 0, "lost": 1, "points": 527.0, "awarded": None}
    awarded = mine["awarded"] if mine["awarded"] is not None else 41.8
    subject, html = mailer.recap_email(SEASON, "you", mine["won"], mine["drawn"],
                                       mine["lost"], mine["points"], awarded,
                                       PREVIEW_TOKEN)
    print(f"  preview -> {address}: {subject}")
    if not mailer.send(address, subject, html):
        sys.exit("The send was refused. Check RESEND_API_KEY and MAIL_FROM.")
    print("Sent. This was a preview: nothing was logged, no player was mailed.")
    return 1


def preview(race: dict, kind: str, address: str) -> int:
    """One copy of the template to one address, whatever the database holds.

    The recipient query needs players, a race the model has entered and — for
    the result — scores. Before any of that exists there is no way to look at
    the thing you are about to send, which is exactly when you most want to.
    Real values are used where they exist; the rest is representative.

    Never logged: a preview must not make a player look already-emailed.
    """
    entries = db.select("model_entries", {"race_id": f"eq.{race['id']}"})
    model_total = float((entries[0].get("total") if entries else None) or 80)

    if kind == "lock":
        subject, html = mailer.lock_email(race, False, PREVIEW_TOKEN)
    else:
        rows = db.select("scores", {"race_id": f"eq.{race['id']}", "limit": "1"})
        score = rows[0] if rows else {"total": model_total + 12,
                                      "beat_model": True, "drew_model": False}
        subject, html = mailer.result_email(race, score, model_total,
                                            PREVIEW_TOKEN)

    print(f"  preview -> {address}: {subject}")
    if not mailer.send(address, subject, html):
        sys.exit("The send was refused. Check RESEND_API_KEY and MAIL_FROM.")
    print("Sent. This was a preview: nothing was logged, no player was mailed.")
    return 1


def main() -> None:
    p = argparse.ArgumentParser(
        description="Send a race email outside the schedule.",
        epilog="Season comes from SEASON (default 2026).",
    )
    p.add_argument("kind", choices=["lock", "result", "recap"],
                   help="lock = Saturday's nudge, result = Monday's verdict, "
                        "recap = the season's one mail (takes no round)")
    p.add_argument("round", type=int, nargs="?",
                   help="round number of the Grand Prix (not for recap)")
    p.add_argument("--force", action="store_true",
                   help="clear the send log first, so players already emailed "
                        "get it again")
    p.add_argument("--dry-run", action="store_true",
                   help="list who would receive it and send nothing")
    p.add_argument("--to", metavar="EMAIL",
                   help="restrict to this player's address (filters the "
                        "recipient list; an address with no account matches "
                        "nobody)")
    p.add_argument("--preview", metavar="EMAIL",
                   help="send one copy of the template to any address, using "
                        "sample data where the database has none. Never "
                        "logged, never sent to players")
    args = p.parse_args()

    if args.kind == "recap":
        print(f"Season {SEASON} — recap email"
              f"{' [PREVIEW]' if args.preview else ''}"
              f"{' [DRY RUN]' if args.dry_run else ''}"
              f"{' [FORCED]' if args.force else ''}", flush=True)
        if args.preview:
            preview_recap(args.preview)
            return
        sent = send_recap(args)
        if args.dry_run:
            print("Nothing was sent.")
        elif sent == 0:
            print("Nothing sent. Everyone owed this mail has already had it — "
                  "add --force to send it again.")
        return
    if args.round is None:
        p.error("a round number is required for lock and result")

    race = race_for(args.round)
    print(f"{race['name']} (round {race['round']}, {race['status']}) — "
          f"{args.kind} email"
          f"{' [PREVIEW]' if args.preview else ''}"
          f"{' [DRY RUN]' if args.dry_run else ''}"
          f"{' [FORCED]' if args.force else ''}",
          flush=True)

    if args.preview:
        preview(race, args.kind, args.preview)
        return

    sent = send_lock(race, args) if args.kind == "lock" else send_result(race, args)

    if args.dry_run:
        print("Nothing was sent.")
    elif sent == 0:
        print("Nothing sent. Everyone owed this mail has already had it — "
              "add --force to send it again.")


if __name__ == "__main__":
    main()
