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


def select(table: str, params: dict | None = None) -> list[dict]:
    """PostgREST filters, e.g. select('races', {'status': 'eq.locked'})."""
    resp = requests.get(f"{_base()}/{table}", headers=_headers(),
                        params=params or {}, timeout=30)
    _check(resp)
    return resp.json()


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


def update(table: str, match: dict, values: dict) -> None:
    """match uses PostgREST operators, e.g. {'id': 'eq.4'}."""
    resp = requests.patch(f"{_base()}/{table}", headers=_headers(),
                          params=match, json=values, timeout=30)
    _check(resp)
