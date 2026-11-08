"""The grid as formula1.com shows it: who is racing, and their portraits.

    python jobs/f1_lineup.py            # print the lineup and the roster diff; writes nothing
    python jobs/f1_lineup.py photos     # (re)write web/public/drivers/<driver_id>.webp
    python jobs/f1_lineup.py roster     # make drivers.active match the lineup (Supabase)

`--season` defaults to the current year. `roster` and the default dry run need
SUPABASE_URL / SUPABASE_SERVICE_KEY, like every job; `photos` needs Pillow
(`venv`), and nothing else.

Why this exists: `sync_schedule.py` builds the roster from the last race's
results and never sets anyone inactive. A driver who stood in once stayed in
the pick pool for the rest of the season, and the one replacing him only
appeared after he had raced — so on the São Paulo weekend of 2026 the pool
offered Hirakawa, who had driven the Haas in Mexico, and not Câmara, who drove
it in Brazil. The page at formula1.com/en/drivers is the only source that has
the next race's lineup before that race happens.

The roster is a subset-and-flag, never a delete: a driver who leaves the grid
keeps his row (and his results, his photo on past race pages) with
`active = false`, which is what takes him out of the pick pool.

Portraits come from the same page. Every card points at the F1 media library
(Cloudinary), and Cloudinary can crop around a face: `c_thumb,g_face,z_0.65`
gives the same head-and-shoulders on all of them, whatever the driver's height
or the pose. They are kept transparent — every surface that draws a portrait
puts the team colour behind it (DESIGN §7, "Driver portraits").
"""

from __future__ import annotations

import argparse
import html
import io
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests

PAGE_URL = "https://www.formula1.com/en/drivers"
MEDIA = "https://media.formula1.com/image/upload"
JOLPICA = "https://api.jolpi.ca/ergast/f1"
PHOTO_DIR = Path(__file__).resolve().parent.parent / "web" / "public" / "drivers"

# 400 px: the profile avatar draws at 128 px on a 2x screen, and the poster
# draws larger still. z_0.65 is "face plus shoulders"; 0.8 is a passport photo,
# 0.5 shows the chest sponsors and leaves the face tiny at 26 px.
PHOTO_SIZE = 400
CROP = f"c_thumb,g_face,z_0.65,w_{PHOTO_SIZE},h_{PHOTO_SIZE}/f_png"

# A grid is eleven teams of two. Anything far from that means the page changed
# shape (or served a bot wall), not that half the field was sacked.
MIN_GRID, MAX_GRID = 20, 24

# Jolpica constructor ids that do not start with the F1 site's team slug.
TEAM_SLUG_ALIASES = {"rb": "racingbulls", "sauber": "audi"}


@dataclass
class Entry:
    first: str
    last: str
    team: str        # as the page prints it: "Haas F1 Team"
    year: int
    team_slug: str   # as the media library files it: "haasf1team"
    ref: str         # the F1 driver reference: "rafcam01"
    driver_id: str | None = None
    code: str | None = None

    @property
    def full_name(self) -> str:
        return f"{self.first} {self.last}"


def _plain(s: str) -> str:
    """'Câmara' -> 'camara', 'Hülkenberg' -> 'hulkenberg'."""
    s = unicodedata.normalize("NFKD", s)
    return re.sub(r"[^a-z0-9 ]", "", s.encode("ascii", "ignore").decode().lower()).strip()


# ─── The page ───────────────────────────────────────────────────────────────

_CARD = re.compile(r'<a\b[^>]*href="/en/drivers/[a-z0-9-]+"[^>]*>(.*?)</a>', re.S)
_TEXT = re.compile(r"<p\b[^>]*>([^<]+)</p>")
_PORTRAIT = re.compile(
    r"common/f1/(\d{4})/([a-z0-9]+)/([a-z0-9]+)/\d{4}[a-z0-9]+right\.webp")


def parse_lineup(page: str) -> list[Entry]:
    """One entry per driver card: first name, last name and team are the
    first three paragraphs of the card, the portrait path carries the year,
    the team slug and the driver reference."""
    out: list[Entry] = []
    seen: set[str] = set()
    for card in _CARD.findall(page):
        img = _PORTRAIT.search(card)
        texts = [html.unescape(t).strip() for t in _TEXT.findall(card)]
        if not img or len(texts) < 3:
            continue
        year, team_slug, ref = img.groups()
        if ref in seen:
            continue
        seen.add(ref)
        out.append(Entry(first=texts[0], last=texts[1], team=texts[2],
                         year=int(year), team_slug=team_slug, ref=ref))
    return out


def fetch_lineup() -> list[Entry]:
    resp = requests.get(PAGE_URL, timeout=30)
    resp.raise_for_status()
    return parse_lineup(resp.text)


# ─── Driver ids ─────────────────────────────────────────────────────────────

def season_drivers(season: int) -> list[dict]:
    """Every driver Jolpica knows for the season, reserves included — which is
    what lets a stand-in be matched before he has a single result."""
    data = requests.get(f"{JOLPICA}/{season}/drivers.json",
                        params={"limit": 100}, timeout=30).json()
    return data["MRData"]["DriverTable"]["Drivers"]


def assign_ids(lineup: list[Entry], drivers: list[dict]) -> list[Entry]:
    """Match on the family name, then on the given name when two share it.
    'Kimi' matches 'Andrea Kimi': the page prints the name he races under."""
    unmatched = []
    for e in lineup:
        last, first = _plain(e.last), _plain(e.first)
        same_family = [d for d in drivers if _plain(d["familyName"]) == last]
        if len(same_family) > 1:
            same_family = [d for d in same_family
                           if first in _plain(d["givenName"]).split()
                           or _plain(d["givenName"]).startswith(first)]
        if len(same_family) != 1:
            unmatched.append(e.full_name)
            continue
        d = same_family[0]
        e.driver_id = d["driverId"]
        e.code = d.get("code") or last.replace(" ", "")[:3].upper()
    if unmatched:
        print(f"lineup: no unique Jolpica driver for {', '.join(unmatched)}")
    return lineup


def checked_lineup(season: int) -> list[Entry]:
    """The lineup, or SystemExit with the reason it can't be trusted."""
    lineup = fetch_lineup()
    if not MIN_GRID <= len(lineup) <= MAX_GRID:
        raise SystemExit(f"lineup: {len(lineup)} driver cards on {PAGE_URL} — "
                         f"expected {MIN_GRID}-{MAX_GRID}; the page has changed")
    years = {e.year for e in lineup}
    if years != {season}:
        raise SystemExit(f"lineup: the page shows {sorted(years)}, not {season}")
    assign_ids(lineup, season_drivers(season))
    if any(e.driver_id is None for e in lineup):
        raise SystemExit("lineup: some drivers have no id — nothing written")
    ids = [e.driver_id for e in lineup]
    if len(set(ids)) != len(ids):
        raise SystemExit("lineup: two cards matched the same driver")
    return lineup


# ─── Roster ─────────────────────────────────────────────────────────────────

def roster_plan(season: int, lineup: list[Entry]) -> tuple[list[dict], list[str], list[str]]:
    """(rows to insert, ids to activate, ids to deactivate).

    A newcomer takes his team name and colour from a teammate already in the
    table, so 'Haas F1 Team' stays spelled the way the results sync spells it
    and his profile theme matches the car. The results sync corrects both
    after his first race anyway."""
    import db

    rows = db.select("drivers", {"season": f"eq.{season}"})
    by_id = {r["driver_id"]: r for r in rows}
    in_lineup = {e.driver_id for e in lineup}

    new_rows = []
    for e in lineup:
        if e.driver_id in by_id:
            continue
        mate = next((by_id[o.driver_id] for o in lineup
                     if o.team_slug == e.team_slug and o.driver_id in by_id), None)
        new_rows.append({
            "season": season,
            "driver_id": e.driver_id,
            "code": e.code,
            "full_name": e.full_name,
            "team": mate["team"] if mate else e.team,
            "team_color": mate["team_color"] if mate else None,
            "active": True,
        })
    activate = sorted(i for i in in_lineup if i in by_id and not by_id[i]["active"])
    deactivate = sorted(r["driver_id"] for r in rows
                        if r["active"] and r["driver_id"] not in in_lineup)
    return new_rows, activate, deactivate


def apply_roster(season: int, lineup: list[Entry]) -> None:
    import db

    new_rows, activate, deactivate = roster_plan(season, lineup)
    if new_rows:
        db.upsert("drivers", new_rows, on_conflict="season,driver_id")
    if activate:
        db.update("drivers", {"season": f"eq.{season}",
                              "driver_id": f"in.({','.join(activate)})"},
                  {"active": True})
    if deactivate:
        db.update("drivers", {"season": f"eq.{season}",
                              "driver_id": f"in.({','.join(deactivate)})"},
                  {"active": False})
    print_plan(new_rows, activate, deactivate, done=True)


def print_plan(new_rows: list[dict], activate: list[str], deactivate: list[str],
               done: bool = False) -> None:
    verb = "" if done else "would be "
    if not (new_rows or activate or deactivate):
        print("roster: already matches the lineup")
        return
    for r in new_rows:
        print(f"roster: {verb}added   {r['driver_id']} ({r['code']}, {r['team']})")
    for i in activate:
        print(f"roster: {verb}back in {i}")
    for i in deactivate:
        print(f"roster: {verb}out     {i} (kept, active = false)")


def sync(season: int) -> None:
    """For sync_schedule.py: apply the lineup if the page can be trusted,
    otherwise say why and leave the roster as the last race left it."""
    try:
        lineup = checked_lineup(season)
    except (SystemExit, requests.RequestException, KeyError, ValueError) as e:
        print(f"lineup: skipped ({e})")
        return
    apply_roster(season, lineup)


# ─── Portraits ──────────────────────────────────────────────────────────────

def portrait_url(year: int, team_slug: str, ref: str) -> str:
    return (f"{MEDIA}/{CROP}/common/f1/{year}/{team_slug}/{ref}/"
            f"{year}{team_slug}{ref}right.webp")


def former_drivers(season: int, lineup: list[Entry], drivers: list[dict]) -> list[Entry]:
    """Drivers who raced this season and are no longer on the page. Their
    portrait is still in the media library — under a team slug the page no
    longer pairs with them, so it is found by asking: their constructors
    first, then every team on the grid."""
    on_page = {e.driver_id for e in lineup}
    slugs = list(dict.fromkeys(e.team_slug for e in lineup))
    out = []
    for d in drivers:
        if not d.get("code") or d["driverId"] in on_page:
            continue
        given = d["givenName"].split()[0]
        ref = f"{_plain(given)[:3]}{_plain(d['familyName']).replace(' ', '')[:3]}01"
        cons = requests.get(f"{JOLPICA}/{season}/drivers/{d['driverId']}/constructors.json",
                            timeout=30).json()["MRData"]["ConstructorTable"]["Constructors"]
        preferred = []
        for c in cons:
            cid = c["constructorId"]
            key = TEAM_SLUG_ALIASES.get(cid, cid.replace("_", ""))
            preferred += [s for s in slugs if s.startswith(key)]
        for slug in dict.fromkeys(preferred + slugs):
            if requests.head(portrait_url(season, slug, ref), timeout=30).status_code == 200:
                out.append(Entry(first=given, last=d["familyName"], team=slug,
                                 year=season, team_slug=slug, ref=ref,
                                 driver_id=d["driverId"], code=d["code"]))
                break
        else:
            print(f"photos: no {season} portrait found for {d['driverId']}")
    return out


def write_photos(season: int, lineup: list[Entry]) -> None:
    from PIL import Image  # local-only dependency: the venv has it, Actions does not

    PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    everyone = lineup + former_drivers(season, lineup, season_drivers(season))
    for e in everyone:
        resp = requests.get(portrait_url(e.year, e.team_slug, e.ref), timeout=60)
        resp.raise_for_status()
        im = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        out = PHOTO_DIR / f"{e.driver_id}.webp"
        # q82 / alpha 90: ~25 kB each, the whole pool well under 1 MB (ALMANAC §9.6).
        im.save(out, "WEBP", quality=82, alpha_quality=90, method=6)
        print(f"photos: {out.name:<24} {out.stat().st_size // 1024:>3} kB  "
              f"{e.full_name} ({e.team_slug}/{e.ref})")
    print(f"photos: {len(everyone)} portraits in {PHOTO_DIR}")


# ─── CLI ────────────────────────────────────────────────────────────────────

def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    p.add_argument("action", nargs="?", choices=["photos", "roster"])
    p.add_argument("--season", type=int, default=datetime.now(timezone.utc).year)
    args = p.parse_args()

    lineup = checked_lineup(args.season)
    for e in sorted(lineup, key=lambda e: (e.team, e.last)):
        print(f"{e.code:<4} {e.driver_id:<18} {e.full_name:<24} {e.team}")

    if args.action == "photos":
        write_photos(args.season, lineup)
    elif args.action == "roster":
        apply_roster(args.season, lineup)
    else:
        print_plan(*roster_plan(args.season, lineup))


if __name__ == "__main__":
    sys.exit(main())
