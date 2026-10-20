"""Minimal Supabase (PostgREST) client for the game jobs.

Uses the service-role key, which bypasses RLS — these scripts are the only
writers of game state besides the players themselves. Requires:

    SUPABASE_URL          https://<project>.supabase.co
    SUPABASE_SERVICE_KEY  service_role secret (never ship this to the client)
"""

from __future__ import annotations

import os
import time

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


# A gateway that gives up, or a request that hangs, is the road between
# GitHub's runners (US) and Supabase (eu-west-1), not a verdict on the
# request. Both have happened to the same 6 KB `model_entries` upsert that
# Postgres runs in 20 ms: a 504 on 2026-09-12, a 30 s read timeout on
# 2026-10-20 that never reached the edge logs. Each took the whole run down
# and mailed a failure for a pass the next hour would have done identically.
RETRY_STATUS = {502, 503, 504}
ATTEMPTS = 4
TIMEOUT = 30


def _send(method: str, url: str, retry: bool = True, **kwargs) -> requests.Response:
    """One PostgREST call, sent again on a timeout, a dropped connection or a
    gateway error — 2, 4, 8 s apart, with a log line each time so a flaky
    night shows in a green run.

    Only for calls that are safe to send twice: reads, merge-duplicates
    upserts, PATCH and DELETE to fixed values. A read timeout does not say
    whether the server applied the request, so anything else passes
    `retry=False`.
    """
    for attempt in range(1, ATTEMPTS + 1):
        last = not retry or attempt == ATTEMPTS
        try:
            resp = requests.request(method, url, timeout=TIMEOUT, **kwargs)
        except (requests.ConnectionError, requests.Timeout) as exc:
            if last:
                raise
            why = type(exc).__name__
        else:
            if last or resp.status_code not in RETRY_STATUS:
                _check(resp)
                return resp
            why = f"HTTP {resp.status_code}"
        delay = 2 ** attempt
        print(f"supabase: {method} {url.partition('/rest/v1')[2]}: {why} "
              f"— attempt {attempt + 1}/{ATTEMPTS} in {delay}s")
        time.sleep(delay)
    raise AssertionError("unreachable")


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
        resp = _send(
            "GET", f"{_base()}/{table}",
            headers=_headers({
                "Range-Unit": "items",
                "Range": f"{offset}-{offset + PAGE - 1}",
                "Prefer": "count=exact",
            }),
            params=params or {},
        )
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
    resp = _send(
        "GET", f"{_base()}/{table}",
        headers=_headers({"Range-Unit": "items", "Range": "0-0",
                          "Prefer": "count=exact"}),
        params=params or {},
    )
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
    _send(
        "POST", f"{_base()}/{table}",
        headers=_headers({"Prefer": "resolution=merge-duplicates"}),
        params=params, json=rows,
    )


def rpc(fn: str, payload: dict | None = None, retry: bool = False):
    """Call a Postgres function through PostgREST (`/rest/v1/rpc/<fn>`).

    The service key is a member of `service_role`, so this reaches the
    operator-only functions of migration 0006 that anon and authenticated are
    revoked from. Returns the decoded body: a scalar, a list of rows, or None
    for a function that returns nothing.

    Not retried unless the caller says so: those operator functions write
    (`admin_delete_player` deletes a user), and only the caller knows its
    function is a read.
    """
    resp = _send("POST", f"{_base()}/rpc/{fn}", retry=retry,
                 headers=_headers(), json=payload or {})
    return resp.json() if resp.content else None


def update(table: str, match: dict, values: dict) -> None:
    """match uses PostgREST operators, e.g. {'id': 'eq.4'}."""
    _send("PATCH", f"{_base()}/{table}", headers=_headers(),
          params=match, json=values)


def delete(table: str, match: dict) -> None:
    """Same filter syntax as update(). PostgREST refuses an unfiltered DELETE,
    which is the safety net we want — so does this."""
    if not match:
        raise ValueError("refusing to DELETE without a filter")
    _send("DELETE", f"{_base()}/{table}", headers=_headers(), params=match)
