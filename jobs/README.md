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
participant. `db.py` is a 60-line PostgREST client.

First-time setup order: apply `supabase/schema.sql`, run `sync_schedule.py`,
then let the scheduled workflows take over.
