# Game jobs

Automation behind F1 Duel. Every script runs locally and in GitHub Actions
(`.github/workflows/`) with the same two env vars:

```bash
export SUPABASE_URL=https://<project>.supabase.co
export SUPABASE_SERVICE_KEY=<service_role secret>
```

| Script | When | What |
|---|---|---|
| `sync_schedule.py` | weekly (Mon) | Calendar → `races`, roster → `drivers`, rank/prorate on new `season_picks` |
| `lock_race.py` | hourly Fri–Sun | Model duel entry (order + probability matrix); flips race to `locked` at start |
| `score_race.py` | hourly Sun–Tue | Official classification → scores everyone, applies duel bonuses, flips to `scored` |
| `set_dotd.py` | manual, Monday | Record the official Driver of the Day, re-scores instantly |
| `settle_season.py` | once, December | Awards championship-pick bonuses |
| `backtest.py` | local only | Replays the scoring rules over past races (no DB needed) |

`scoring.py` is the pure rules engine (docs/GAME_DESIGN.md §2.2) — the only
place scoring logic lives. `model_bridge.py` wraps `src/predict.py` as a duel
participant. `db.py` is a PostgREST client that pages past the API's 1000-row
cap (see `supabase/README.md`).

## Staying switched on

`.github/workflows/keepalive.yml` runs monthly and has no game logic. It exists
because two idle timers can take the site down between seasons:

- **GitHub** disables scheduled workflows in a public repo after **60 days with
  no repository activity**. A workflow *run* is not activity — a commit is — so
  the crons cannot keep themselves alive. Keepalive pushes a dated line to
  `.github/keepalive`, and re-enables the schedules through the API as a
  fallback.
- **Supabase** pauses a free project after **7 days with no database request**.
  `score_race.py` normally covers this by querying `races` hourly on Sun–Tue,
  but only while GitHub is still running it. Keepalive pings the database
  directly and fails loudly if it answers anything but 200, since a paused
  project needs a human in the dashboard.

If you push to this repo every couple of months anyway, keepalive changes
nothing. It is there for the months when you don't.

First-time setup order: apply `supabase/schema.sql`, run `sync_schedule.py`,
then let the scheduled workflows take over.
