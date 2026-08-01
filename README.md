# 🏎 F1 Race Predictor

Predict the finishing order of Formula 1 races — and qualifying — from historical
data, then explore the result in a clean, interactive web interface.

The project trains a machine-learning ensemble on eight seasons of real F1 data
(2018–2025) and serves its predictions through a small Flask app: podium, full
grid, per-driver key factors, win/podium probabilities, live weather, circuit
maps, championship standings and title-race scenarios.

On top of the model sits **F1 Duel** — a game where players predict the top 10
of every Grand Prix and battle the model all season long, with rarity-weighted
scoring, leagues and season-long championship picks. Rules and architecture:
[`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).

**Working on this project?** [`docs/ALMANAC.md`](docs/ALMANAC.md) is the
complete internal manual — every component, why it exists, how it is wired, and
what to do when it breaks.

---

## What it does

### 🔮 Race & qualifying prediction
- Predicts the full finishing order for any Grand Prix, past or upcoming.
- **Post-qualifying mode** — uses the real qualifying grid for the sharpest read.
- **Pre-qualifying mode** — before qualifying has happened, estimates the grid
  from free-practice pace so a prediction is available all weekend.
- **Weather what-if** — force a *wet* or *dry* scenario to see how conditions
  reshuffle the order.

### 📊 Explainable results
- Each driver comes with the **top factors** driving their predicted position
  (via SHAP), labelled in plain English — qualifying position, recent form,
  car strength, circuit history, weather, and more.
- **Win and podium probabilities** plus a **confidence score**, estimated with a
  Monte-Carlo simulation over the model's scores.
- When a race is in the past, predictions are compared against **actual results**
  with accuracy metrics (MAE, exact hits, podium/top-10 detection).

### 🏆 Season insight
- **Driver & constructor standings** rebuilt race by race, with cumulative
  points evolution.
- **Title contention** — who is still mathematically alive for the drivers'
  championship, given the points left on the table.
- **Season accuracy dashboard** — how well the model did across a whole season.

### 🌦 Context around every race
- **Live weather**: forecast for upcoming races, historical readings for past
  ones (via Open-Meteo, no API key needed).
- **Circuit maps**: track outline, length, corner count and estimated lap count,
  drawn from real FastF1 telemetry.
- **Session data**: FP1 / FP2 / FP3 and qualifying classifications on demand.
- **Countdown** to the next Grand Prix.

---

## The model

An ensemble of **XGBoost + LightGBM**, blended by validation performance.

- **~39 engineered features**, all using information available *before* the race:
  qualifying and practice pace, championship position, rolling driver/team form,
  reliability, circuit history, teammate benchmarks, weather and track traits.
- **Temporal split** to avoid leakage — train on 2018–2023, validate on 2024,
  test on 2025–2026.
- Hyperparameters tuned with **Optuna**.

---

## Project structure

```
src/
  collect.py    Download historical F1 data via FastF1 (race, quali, sprint, practice)
  features.py   Build the ML training set (one row per driver per Grand Prix)
  train.py      Tune + train the XGBoost/LightGBM ensemble (→ models/)
  predict.py    Predict a given race, in the terminal or as a library
  app.py        Flask web app exposing predictions and all the extras
webapp/         Model-page frontend (HTML / CSS / JS, driver & team assets)
web/            F1 Duel — Next.js site: home + game (deployed on Vercel)
jobs/           Game automation: sync schedule, lock model entry, score races
supabase/       Database schema + row-level-security policies
docs/           Almanac (full internal manual), game design, deployment
models/         Trained models + metadata
data/           Processed datasets and on-disk caches
```

Model work and game work live in separate directories on a single `main`
branch; day-to-day changes go through short-lived `feat/…` branches and PRs.

---

## Getting started

### Quickest (macOS)
Double-click **`Launch F1 Predictor.command`** — it creates the virtual
environment, installs dependencies, starts the server and opens the app.

### Manual
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python src/app.py        # → http://127.0.0.1:5050
```

### Command line
```bash
python src/predict.py                             # next race, automatically
python src/predict.py --year 2026 --round 12      # a specific GP (after qualifying)
python src/predict.py --year 2026 --round 12 --pre-quali   # before qualifying
```

### Rebuilding the model (optional)
```bash
python src/collect.py 2025 --force   # refresh data after a race weekend
python src/features.py               # rebuild the feature set
python src/train.py                  # retrain the ensemble
```

---

## Built with

Python · FastF1 · XGBoost · LightGBM · scikit-learn · Optuna · pandas · Flask ·
Open-Meteo
