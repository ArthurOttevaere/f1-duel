# F1 Duel — Game Design & Platform Foundation

> Beat the model. Every Grand Prix, until the last lap of the season.

This document is the single source of truth for the game platform built on top of
the F1 Race Predictor model. Every implementation decision should trace back to
a rule or principle written here. When a rule changes, change it here first.

---

## 1. Concept

Every race weekend, each player submits an ordered **top 10 prediction** for the
Grand Prix. The ML model submits its own (its post-qualifying predicted order).
After the race, both are scored with the exact same formula against the official
classification. Player vs model: one duel per Grand Prix, all season long.

**The core design idea — rarity pays.** Points are multiplied by how *unlikely*
the model thought each correct pick was (using the model's own Monte-Carlo
position probabilities). By construction the model always plays its most likely
order, so it almost never earns multipliers. A human beats the model by taking
bold calls that land: that asymmetry is the game.

---

## 2. Rules

### 2.1 The weekly duel

- Predictions open when the race weekend's data is available (schedule is known
  all season, so effectively always open for the next GP).
- Predictions **lock at the official race start time**. Players can edit freely
  until then. The model's entry is its **post-qualifying prediction**, generated
  after qualifying and frozen at the same lock time.
- Other players' predictions are hidden until lock (enforced server-side, see §5).
- Main race only in v1. Sprint races are out of scope (v2 candidate).

### 2.2 Scoring a prediction (identical for players and the model)

For each of the 10 predicted slots, compare with the official race classification:

| Outcome | Base points |
|---|---|
| Driver finished at the **exact predicted position** | **10** |
| Driver finished **±1 position** from prediction | **5** |
| Driver finished elsewhere **inside the top 10** | **2** |
| Driver finished outside the top 10 / not classified | 0 |

**The model as an opponent (calibrated entry).** The model does not play its
raw ML finishing order in the duel. Backtesting the scoring on 2025–2026
(`jobs/backtest.py`) showed the raw order is a weak opponent — a human who
simply copies the starting grid beats it most weekends, because grid position
is a very strong predictor of the finish and exact-position hits dominate the
score. So the model's duel entry is **calibrated**:

- Its position-probability matrix blends the ML Monte-Carlo probabilities with
  an empirical *P(finish | grid)* prior from past seasons (weight 0.25 on the
  ML signal — `jobs/grid_prior.py`, `jobs/model_bridge.py`).
- It plays the top 10 that **maximizes its own expected game score** under that
  calibrated matrix.

After calibration the model is a coin-flip-to-slight-favourite against a
grid-copying human (grid vs model went from 8-0-3 to 3-5-3 across 2026), so the
duel is winnable by *good* play but not by *lazy* play. A human beats it by
deviating from the favourites where they have a genuine read — and the rarity
multiplier pays exactly those correct deviations.

**Rarity multiplier** — applied to *exact-position* hits only. Let `p` be the
model's calibrated probability (frozen at lock time) that this driver finishes
at exactly that position:

| Model probability `p` | Multiplier |
|---|---|
| p ≥ 30 % | ×1 |
| 15 % ≤ p < 30 % | ×1.5 |
| 5 % ≤ p < 15 % | ×2 |
| p < 5 % | ×3 |

**Bonuses:**

| Bonus | Points |
|---|---|
| Exact podium (P1–P2–P3 all exact) | +15 |
| Perfect top 10 (all exact) | +100 |
| Correct Driver of the Day (players only, see §2.4) | +5 |
| Beating the model on this GP (players only) | +10 |
| Draw with the model | +3 |

Maximum realistic GP score ≈ 130–250 pts depending on rarity; a typical decent
weekend lands around 40–70 pts.

**Edge cases:**
- Not-classified drivers (DNF/DSQ/DNS) count as outside the top 10.
- The official FIA classification at the time of scoring is final; later
  penalties do not retroactively change scores.
- If the model prediction is unavailable at lock (job failure), the fallback
  model entry is the starting grid order — the duel always happens.

### 2.3 Season-long championship picks

At signup (any point in the season), a player may pick the **Drivers' champion**
and the **Constructors' champion**. Picks lock at first submission and cannot be
changed. Payout at season end:

| Pick standing *at lock time* | Driver bonus | Constructor bonus |
|---|---|---|
| Current championship leader | +50 | +30 |
| Currently P2–P3 | +75 | +50 |
| Currently P4 or lower | +150 | +90 |

The bonus is **prorated by the fraction of the season remaining at lock**
(floor 20 %), so a mid-season pick is worth less than a round-1 pick and the
system works for a mid-season launch.

The champion picks also define the player's **profile theme** (team colors,
driver imagery) — see §4.

### 2.4 Driver of the Day

Players may optionally vote for the official F1 "Driver of the Day" before race
start (+5 if correct). This is a deliberate human-only edge in the duel: the
model cannot vote. There is no official DotD API; the result is entered manually
after the race (admin script / Supabase dashboard) and the bonus is applied on
the next scoring pass.

### 2.5 Standings & duels

- **Season leaderboard**: total points across all scored GPs (+ bonuses).
- **Duel record vs the model**: W-D-L, shown prominently on profiles.
- **Leagues** (v1.1): private groups joined via a unique 6-character code; a
  league is just a filtered leaderboard, all scoring is global.

---

## 3. Architecture

**Decisions (2026-07-27):** Vercel frontend + Flask API on Render · lock at race
start · UI in English · all-free hosting.

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  web/  (Next.js, Vercel)│     │ Flask model app (Render) │
│  home + game UI          │────▶│ existing prediction page  │
│  talks to Supabase       │link │ + /api/* live endpoints   │
└───────────┬─────────────┘     └──────────▲───────────────┘
            │ supabase-js (auth + data)     │ runs the model on demand
┌───────────▼─────────────┐     ┌──────────┴───────────────┐
│  Supabase (free tier)    │◀────│ GitHub Actions (free)     │
│  Postgres + Auth + RLS   │write│ jobs/: lock model preds,  │
│  all game state          │     │ score races post-GP       │
└─────────────────────────┘     └──────────────────────────┘
```

- **`web/` — Next.js (App Router, TypeScript, Tailwind) on Vercel.** Home page,
  entire game UI, auth via Supabase (magic link + Google OAuth). Never affected
  by Render cold starts.
- **Flask app on Render free tier** — the existing model page, unchanged. The
  home page CTA links to it (later: `model.` subdomain or Vercel rewrite).
  UptimeRobot ping mitigates the 15-min sleep.
- **Supabase free tier** — Postgres, Auth, Row Level Security. The game state
  lives here and is *never* computed by the Flask server, so the game does not
  depend on Render availability.
- **GitHub Actions** — the model's "player agent". Two scheduled workflows (see
  §6) run the Python model headlessly and write to Supabase via service key.

**Why the game does not call the Flask API:** free-tier servers sleep and jobs
must run even if no one visits. Locking and scoring are batch jobs with strict
timing — GitHub Actions cron + Supabase is deterministic and free.

---

## 4. Site map (`web/`)

| Route | Content |
|---|---|
| `/` | Hero (full-bleed high-quality F1 photo, headline, 2 CTAs: **Play the duel** / **Explore the model**), scroll sections explaining the game and the model, footer. |
| `/game` | Dashboard: next GP countdown, prediction editor (drag-and-drop ordered top 10 + DotD pick), current duel status, season summary strip. |
| `/game/races/[round]` | Duel review: player vs model vs actual, side-by-side, per-slot point breakdown, rarity multipliers highlighted. |
| `/game/standings` | Global leaderboard + duel records; league filter. |
| `/game/leagues` | Create / join a league by code (v1.1). |
| `/profile/[username]` | Stats, duel history, championship picks — themed with the picked team/driver colors. |
| `/login` | Supabase auth (magic link + Google). |

Design language: dark, premium motorsport aesthetic consistent with the existing
model page (reuse its palette and typography so the two apps feel like one
product).

---

## 5. Data model (Supabase / Postgres)

```
profiles          id (= auth.users.id), username UNIQUE, created_at
races             id, season, round, name, circuit, country,
                  quali_at, race_at, status ∈ {scheduled, locked, scored}
model_entries     race_id PK→races, predicted_order jsonb (10 codes),
                  prob_matrix jsonb (driver × position probabilities), locked_at
predictions       id, user_id→profiles, race_id→races, picks jsonb (10 codes),
                  dotd text NULL, updated_at, UNIQUE(user_id, race_id)
results           race_id PK→races, classification jsonb, dotd text NULL, scored_at
scores            race_id, user_id NULL = the model, total numeric,
                  breakdown jsonb, beat_model bool, PK(race_id, user_id)
season_picks      user_id, season, champion_driver, champion_team,
                  locked_at, driver_tier, team_tier, prorate numeric
leagues           id, name, code CHAR(6) UNIQUE, owner_id
league_members    league_id, user_id, joined_at
```

**Row Level Security (the fair-play layer):**
- `predictions`: a user can INSERT/UPDATE only their own row and only while
  `races.status = 'scheduled'` AND `now() < races.race_at`. SELECT own rows
  always; others' rows only when the race is locked or scored.
- `scores`, `results`, `model_entries`, `races`: public read, service-role write.
- `season_picks`: insert-only by owner (no update — locked by design).

---

## 6. Automated jobs (`jobs/` + `.github/workflows/`)

1. **`sync-schedule`** (weekly): upserts the season calendar into `races` from
   FastF1.
2. **`lock-race`** (hourly during race weekends): once qualifying results exist
   and the race hasn't started → run the model (`jobs/model_bridge.py`), upsert
   `model_entries` (calibrated order + probability matrix, see §2.2). At
   `race_at`, set `races.status = 'locked'`.
3. **`score-race`** (hourly Sun–Tue): for locked races whose classification is
   available via FastF1 → write `results`, compute `scores` for every prediction
   and the model with the §2.2 formula, apply duel bonuses, set
   `status = 'scored'`. Re-runs are idempotent (DotD entered late is picked up
   by the next pass).

All jobs are plain Python scripts in `jobs/`, runnable locally with the same
env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) — GitHub Actions is just the
scheduler.

---

## 7. Repository layout & git workflow

```
f1_race_predictor/
  src/        ML pipeline + Flask model app (existing, unchanged)
  webapp/     model page frontend (existing, unchanged)
  models/     trained artifacts
  data/       datasets + caches
  web/        Next.js site — home + game (Vercel)
  jobs/       lock/score/sync scripts (GitHub Actions)
  supabase/   schema.sql, RLS policies, seed
  docs/       this document
  .github/workflows/
```

Workflow: `main` is the single source of truth. The historical `model` branch is
merged into `main` and retired. All new work happens on short-lived feature
branches (`feat/…`, `fix/…`) merged via PR. Model work and game work are
separated by *directory*, not by long-lived branches.

---

## 8. Build phases

| Phase | Deliverable |
|---|---|
| **0 — Foundation** | Merge `model` → `main`, repo layout above, this doc. |
| **1 — Backbone** | Supabase schema + RLS; `jobs/` scripts validated against past 2026 races (backtest the scoring on real data). |
| **2 — Site core** | Next.js app: home page (hero, sections, footer), auth, prediction editor for the next GP. |
| **3 — The duel** | Scoring display, race-by-race duel review, season standings, profile with team theming. |
| **4 — Extras** | Leagues by code, DotD voting, championship picks flow, polish pass. |
| **5 — Launch** | Vercel + Render + Actions in production, custom domain if desired. |
