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

    # try one template on yourself before touching the field
    python jobs/send_mail.py result 11 --force --to hello@f1-duel.com

`--force` clears `email_log` for that race and kind, so everyone is owed the
mail again. Without it, anyone already emailed is skipped — which is what makes
re-running safe, and what you are deliberately overriding.

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
            f"Round {race['round']} has no model entry yet — the nudge would be "
            f"claiming something untrue. Run lock_race.py first."
        )
    return mailer.send_lock_emails(race, force=args.force, dry_run=args.dry_run,
                                   only_to=args.to)


def send_result(race: dict, args) -> int:
    if race["status"] != "scored":
        sys.exit(f"Round {race['round']} is '{race['status']}', not scored — "
                 f"there is no result to report. Run score_race.py first.")

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


def main() -> None:
    p = argparse.ArgumentParser(
        description="Send a race email outside the schedule.",
        epilog="Season comes from SEASON (default 2026).",
    )
    p.add_argument("kind", choices=["lock", "result"],
                   help="lock = Saturday's nudge, result = Monday's verdict")
    p.add_argument("round", type=int, help="round number of the Grand Prix")
    p.add_argument("--force", action="store_true",
                   help="clear the send log first, so players already emailed "
                        "get it again")
    p.add_argument("--dry-run", action="store_true",
                   help="list who would receive it and send nothing")
    p.add_argument("--to", metavar="EMAIL",
                   help="restrict to one address — for trying a template on "
                        "yourself first")
    args = p.parse_args()

    race = race_for(args.round)
    print(f"{race['name']} (round {race['round']}, {race['status']}) — "
          f"{args.kind} email"
          f"{' [DRY RUN]' if args.dry_run else ''}"
          f"{' [FORCED]' if args.force else ''}")

    sent = send_lock(race, args) if args.kind == "lock" else send_result(race, args)

    if args.dry_run:
        print("Nothing was sent.")
    elif sent == 0:
        print("Nothing sent. Everyone owed this mail has already had it — "
              "add --force to send it again.")


if __name__ == "__main__":
    main()
