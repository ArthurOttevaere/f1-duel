"""The game's outbound voice: two emails per Grand Prix, sent through Resend.

Run by the jobs, never by the web app — the address lives in `auth.users` and
only the service key can reach it (migration 0008).

    RESEND_API_KEY   from resend.com; unset → every send is a logged no-op,
                     so the jobs keep working exactly as before
    MAIL_FROM        e.g. "F1 Duel <duel@yourdomain>"; must be a verified
                     Resend sender
    SITE_URL         where the buttons point (default: the Vercel production URL)

Sending is **logged, not retried**. `email_log` is written per recipient after
a successful send, and `email_recipients()` excludes anyone already logged — so
a job that re-runs (score_race re-runs hourly for ten days) picks up only the
people it missed, and a send that failed is simply attempted again next hour.
"""

from __future__ import annotations

import os

import requests

import db

RESEND_ENDPOINT = "https://api.resend.com/emails"
DEFAULT_SITE = "https://f1-race-predictor-one.vercel.app"

BG = "#07080b"
CARD = "#12141a"
INK = "#f4f6fa"
DIM = "#a7adba"
MUTE = "#6c7280"
RACE = "#ff1e3c"


def site_url() -> str:
    return (os.environ.get("SITE_URL") or DEFAULT_SITE).rstrip("/")


def _enabled() -> bool:
    return bool(os.environ.get("RESEND_API_KEY") and os.environ.get("MAIL_FROM"))


def _shell(title: str, lede: str, body_html: str, cta_label: str,
           cta_path: str, token: str) -> str:
    """One template for both mails.

    Tables and inline styles throughout: this is email, where there is no
    stylesheet, no flexbox worth trusting, and a dark background only survives
    if it is painted on an element rather than assumed.
    """
    site = site_url()
    return f"""\
<!doctype html>
<html><body style="margin:0;padding:0;background:{BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:{BG};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="max-width:520px;background:{CARD};border-radius:16px;
                  border:1px solid rgba(255,255,255,0.09);padding:32px;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                  Helvetica,Arial,sans-serif;">
      <tr><td>
        <p style="margin:0;font-size:13px;letter-spacing:4px;font-weight:700;
                  color:{RACE};">F1 <span style="color:{INK};">DUEL</span></p>
        <h1 style="margin:24px 0 0;font-size:26px;line-height:1.2;
                   color:{INK};font-weight:800;">{title}</h1>
        <p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:{DIM};">
          {lede}</p>
        {body_html}
        <p style="margin:28px 0 0;">
          <a href="{site}{cta_path}"
             style="display:inline-block;background:{RACE};color:#ffffff;
                    text-decoration:none;font-weight:600;font-size:15px;
                    padding:13px 26px;border-radius:999px;">{cta_label}</a>
        </p>
        <p style="margin:28px 0 0;padding-top:18px;font-size:12px;
                  line-height:1.5;color:{MUTE};
                  border-top:1px solid rgba(255,255,255,0.09);">
          You're getting this because you play F1 Duel.
          <a href="{site}/unsubscribe/{token}" style="color:{DIM};">
            Turn these emails off</a>.<br>
          An unofficial fan project — not associated with Formula 1 or the FIA.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


def _row(label: str, value: str, tone: str = INK) -> str:
    return (f'<tr><td style="padding:6px 0;font-size:15px;color:{DIM};">{label}</td>'
            f'<td align="right" style="padding:6px 0;font-size:15px;'
            f'font-weight:700;color:{tone};">{value}</td></tr>')


def lock_email(race: dict, entered: bool, token: str) -> tuple[str, str]:
    """Saturday: qualifying is done, the model has played its hand."""
    name = race.get("name", "the Grand Prix")
    if entered:
        title = "The model has played its hand"
        lede = (f"Its entry for the {name} is locked in. Yours is too — but you "
                f"can still change your mind right up to lights out.")
        cta = "Review your top 10"
    else:
        title = f"You haven't entered the {name}"
        lede = ("Qualifying is done and the model's entry is in. Yours isn't. "
                "It takes about a minute, and a race you sit out counts for "
                "nothing either way.")
        cta = "Make your picks"
    subject = (f"{name}: the model is in" if entered
               else f"{name}: you haven't picked yet")
    return subject, _shell(title, lede, "", cta, "/game", token)


def result_email(race: dict, score: dict, model_total: float,
                 token: str) -> tuple[str, str]:
    """Monday: how it went, in the one number that matters."""
    name = race.get("name", "the Grand Prix")
    total = float(score["total"])
    margin = total - float(model_total)
    beat = bool(score.get("beat_model"))
    drew = bool(score.get("drew_model"))

    if beat:
        title = "You beat the model"
        lede = f"{name} goes to you."
        tone = "#34d399"
    elif drew:
        title = "Dead heat"
        lede = f"You and the model finished the {name} on the same score."
        tone = "#fbbf24"
    else:
        title = "The model takes this one"
        lede = f"It edged you at the {name}. There's another on Sunday."
        tone = RACE

    sign = "+" if margin > 0 else "−" if margin < 0 else ""
    body = f"""
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="margin-top:22px;border-top:1px solid rgba(255,255,255,0.09);">
          {_row("Your score", f"{total:g}")}
          {_row("The model", f"{model_total:g}")}
          {_row("Margin", f"{sign}{abs(margin):g}", tone)}
        </table>"""
    subject = f"{name}: {'you beat the model' if beat else 'dead heat' if drew else 'the model won'}"
    return subject, _shell(title, lede, body, "See the breakdown",
                           f"/game/races/{race['round']}", token)


def send(to: str, subject: str, html: str) -> bool:
    """One email. False (with a printed reason) rather than an exception: one
    bad address must not take down a scoring run."""
    if not _enabled():
        print(f"  [mail off] would send to {to}: {subject}")
        return False
    try:
        resp = requests.post(
            RESEND_ENDPOINT,
            headers={
                "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}",
                "Content-Type": "application/json",
            },
            json={
                "from": os.environ["MAIL_FROM"],
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=20,
        )
    except requests.RequestException as e:
        print(f"  mail to {to} failed: {e}")
        return False
    if resp.status_code >= 400:
        print(f"  mail to {to} rejected {resp.status_code}: {resp.text[:200]}")
        return False
    return True


def recipients(race_id: int, kind: str) -> list[dict]:
    """Everyone still owed this mail for this race (migration 0008)."""
    return db.rpc("email_recipients", {"p_race_id": race_id, "p_kind": kind}) or []


def mark_sent(race_id: int, user_id: str, kind: str) -> None:
    db.upsert("email_log", {"race_id": race_id, "user_id": user_id, "kind": kind},
              on_conflict="race_id,user_id,kind")


def send_lock_emails(race: dict) -> None:
    """Post-qualifying nudge. Silent if the mailer isn't configured."""
    sent = 0
    for r in recipients(race["id"], "lock"):
        subject, html = lock_email(race, bool(r.get("entered")), r["token"])
        if send(r["email"], subject, html):
            mark_sent(race["id"], r["user_id"], "lock")
            sent += 1
    if sent:
        print(f"round {race['round']}: {sent} lock email(s) sent")


def send_result_emails(race: dict, scores_by_user: dict[str, dict],
                       model_total: float) -> None:
    """One result per player who actually entered."""
    sent = 0
    for r in recipients(race["id"], "result"):
        score = scores_by_user.get(r["user_id"])
        if not score:
            continue  # sat this one out; nothing to report
        subject, html = result_email(race, score, model_total, r["token"])
        if send(r["email"], subject, html):
            mark_sent(race["id"], r["user_id"], "result")
            sent += 1
    if sent:
        print(f"round {race['round']}: {sent} result email(s) sent")
