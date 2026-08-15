"""Minimal Supabase (PostgREST) client for the game jobs.

Uses the service-role key, which bypasses RLS — these scripts are the only
writers of game state besides the players themselves. Requires:

    SUPABASE_URL          https://<project>.supabase.co
    SUPABASE_SERVICE_KEY  service_role secret (never ship this to the client)
"""

from __future__ import annotations

import os

import requests


def _base() -> str:
    url = os.environ.get("SUPABASE_URL")
    if not url:
        raise SystemExit("SUPABASE_URL is not set")
    return url.rstrip("/") + "/rest/v1"


def _headers(extra: dict | None = None) -> dict:
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not key:
        raise SystemExit("SUPABASE_SERVICE_KEY is not set")
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def _check(resp: requests.Response) -> None:
    if resp.status_code >= 400:
        raise RuntimeError(f"Supabase {resp.request.method} {resp.url} "
                           f"-> {resp.status_code}: {resp.text[:500]}")


PAGE = 1000


def _content_range_total(resp: requests.Response) -> int | None:
    """The `*` in `Content-Range: 0-999/*` means PostgREST didn't count."""
    header = resp.headers.get("Content-Range", "")
    total = header.rpartition("/")[2]
    return int(total) if total.isdigit() else None


def select(table: str, params: dict | None = None) -> list[dict]:
    """PostgREST filters, e.g. select('races', {'status': 'eq.locked'}).

    Pages until the table is exhausted. PostgREST truncates at `db-max-rows`
    (1000 by default on Supabase) and says nothing about it, so a single
    unpaged GET quietly returns "the first thousand" — which is how a race
    with more than a thousand entries would have scored only a thousand
    players, with no error anywhere.
    """
    rows: list[dict] = []
    offset = 0
    while True:
        resp = requests.get(
            f"{_base()}/{table}",
            headers=_headers({
                "Range-Unit": "items",
                "Range": f"{offset}-{offset + PAGE - 1}",
                "Prefer": "count=exact",
            }),
            params=params or {}, timeout=30,
        )
        _check(resp)
        page = resp.json()
        rows.extend(page)

        total = _content_range_total(resp)
        if total is not None and len(rows) >= total:
            return rows
        # A short page means the end, whether or not the server counted.
        if len(page) < PAGE:
            return rows
        offset += len(page)
        if offset > 500_000:
            raise RuntimeError(f"select({table}) exceeded 500k rows — "
                               f"refusing to keep paging")


def count(table: str, params: dict | None = None) -> int:
    """Server-side row count, used to verify a paged read is complete."""
    resp = requests.get(
        f"{_base()}/{table}",
        headers=_headers({"Range-Unit": "items", "Range": "0-0",
                          "Prefer": "count=exact"}),
        params=params or {}, timeout=30,
    )
    _check(resp)
    total = _content_range_total(resp)
    if total is None:
        raise RuntimeError(f"count({table}): server returned no exact count")
    return total


def upsert(table: str, rows: list[dict] | dict, on_conflict: str | None = None) -> None:
    if isinstance(rows, dict):
        rows = [rows]
    if not rows:
        return
    params = {"on_conflict": on_conflict} if on_conflict else {}
    resp = requests.post(
        f"{_base()}/{table}",
        headers=_headers({"Prefer": "resolution=merge-duplicates"}),
        params=params, json=rows, timeout=30,
    )
    _check(resp)


def rpc(fn: str, payload: dict | None = None):
    """Call a Postgres function through PostgREST (`/rest/v1/rpc/<fn>`).

    The service key is a member of `service_role`, so this reaches the
    operator-only functions of migration 0006 that anon and authenticated are
    revoked from. Returns the decoded body: a scalar, a list of rows, or None
    for a function that returns nothing.
    """
    resp = requests.post(f"{_base()}/rpc/{fn}", headers=_headers(),
                         json=payload or {}, timeout=30)
    _check(resp)
    return resp.json() if resp.content else None


def update(table: str, match: dict, values: dict) -> None:
    """match uses PostgREST operators, e.g. {'id': 'eq.4'}."""
    resp = requests.patch(f"{_base()}/{table}", headers=_headers(),
                          params=match, json=values, timeout=30)
    _check(resp)


def delete(table: str, match: dict) -> None:
    """Same filter syntax as update(). PostgREST refuses an unfiltered DELETE,
    which is the safety net we want — so does this."""
    if not match:
        raise ValueError("refusing to DELETE without a filter")
    resp = requests.delete(f"{_base()}/{table}", headers=_headers(),
                           params=match, timeout=30)
    _check(resp)
