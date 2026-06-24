"""
app.py — Interface web pour le prédicteur de courses F1.

Lance un petit serveur Flask qui expose la prédiction du modèle (predict.py)
sous forme d'une interface visuelle : podium, classement complet et
emplacements (placeholders) prêts à recevoir les vraies têtes des pilotes.

Usage:
  python src/app.py
  → ouvre http://127.0.0.1:5000

Les têtes des pilotes :
  Dépose une image carrée nommée  <driver_id>.png  dans  webapp/static/drivers/
  (ex: max_verstappen.png, norris.png). Tant qu'elle n'existe pas, un avatar
  avec les initiales et la couleur d'équipe est affiché à la place.
"""

import json
import os
import sys
import threading

from flask import Flask, jsonify, render_template, request

# predict.py vit dans le même dossier
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import predict as predictor  # noqa: E402

ROOT            = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP_DIR      = os.path.join(ROOT, 'webapp')
SCHED_CACHE_DIR = os.path.join(ROOT, 'data', 'schedule_cache')
TRACK_CACHE_DIR = os.path.join(ROOT, 'data', 'track_cache')
ACC_CACHE_DIR   = os.path.join(ROOT, 'data', 'accuracy_cache')
for _d in (SCHED_CACHE_DIR, TRACK_CACHE_DIR, ACC_CACHE_DIR):
    os.makedirs(_d, exist_ok=True)

app = Flask(
    __name__,
    template_folder=os.path.join(WEBAPP_DIR, 'templates'),
    static_folder=os.path.join(WEBAPP_DIR, 'static'),
)

# La prédiction fait des appels réseau (FastF1) → on protège contre les appels
# concurrents et on met en cache les résultats déjà calculés.
_lock = threading.Lock()
_cache: dict = {}


# ─── Couleurs d'équipe (accent visuel) ───────────────────────────────────────

TEAM_COLORS = {
    'Red Bull Racing': '#3671C6',
    'Ferrari':         '#E8002D',
    'Mercedes':        '#27F4D2',
    'McLaren':         '#FF8000',
    'Aston Martin':    '#229971',
    'Alpine':          '#0093CC',
    'Williams':        '#64C4FF',
    'RB':              '#6692FF',
    'Racing Bulls':    '#6692FF',
    'Kick Sauber':     '#52E252',
    'Sauber':          '#52E252',
    'Audi':            '#BB0A30',
    'Haas F1 Team':    '#B6BABD',
    'Cadillac':        '#C8102E',
    # Saisons passées
    'AlphaTauri':      '#2B4562',
    'Alfa Romeo':      '#900000',
    'Alfa Romeo Racing': '#900000',
    'Renault':         '#FFF500',
    'Toro Rosso':      '#0032FF',
    'Racing Point':    '#F596C8',
    'Force India':     '#F596C8',
}
DEFAULT_COLOR = '#8A8F98'


def _display_name(driver_id: str, abbrev: str) -> str:
    """max_verstappen → Max Verstappen ; sinon retombe sur l'abréviation."""
    if not driver_id or not isinstance(driver_id, str):
        return abbrev or '???'
    parts = driver_id.replace('-', '_').split('_')
    # Ignore les prénoms parasites parfois préfixés (kevin_magnussen, etc.)
    nice = ' '.join(p.capitalize() for p in parts if p)
    return nice or (abbrev or '???')


def _initials(name: str, abbrev: str) -> str:
    if abbrev and isinstance(abbrev, str) and len(abbrev) >= 2:
        return abbrev[:3].upper()
    bits = name.split()
    if len(bits) >= 2:
        return (bits[0][0] + bits[-1][0]).upper()
    return name[:2].upper()


def _have_headshot(driver_id: str) -> bool:
    path = os.path.join(app.static_folder, 'drivers', f'{driver_id}.png')
    return os.path.isfile(path)


# ─── Identité d'équipe (badge / logo) ────────────────────────────────────────

# Abréviation pour le badge de repli (quand aucun logo n'est déposé).
TEAM_ABBR = {
    'Red Bull Racing': 'RBR', 'Ferrari': 'FER', 'Mercedes': 'MER', 'McLaren': 'MCL',
    'Aston Martin': 'AMR', 'Alpine': 'ALP', 'Williams': 'WIL', 'RB': 'RB',
    'Racing Bulls': 'RB', 'Kick Sauber': 'SAU', 'Sauber': 'SAU', 'Audi': 'AUD',
    'Haas F1 Team': 'HAA', 'Cadillac': 'CAD', 'AlphaTauri': 'AT', 'Alfa Romeo': 'ALF',
    'Alfa Romeo Racing': 'ALF', 'Renault': 'REN', 'Toro Rosso': 'TR',
    'Racing Point': 'RP', 'Force India': 'FI',
}


def _team_slug(team: str) -> str:
    """'Red Bull Racing' → 'red_bull_racing' (pour static/teams/<slug>.png)."""
    return ''.join(c if c.isalnum() else '_' for c in (team or '').lower()).strip('_')


def _have_team_logo(team: str) -> bool:
    slug = _team_slug(team)
    return bool(slug) and os.path.isfile(os.path.join(app.static_folder, 'teams', f'{slug}.png'))


def _team_abbr(team: str) -> str:
    if team in TEAM_ABBR:
        return TEAM_ABBR[team]
    letters = ''.join(w[0] for w in (team or '').split() if w)[:3].upper()
    return letters or '—'


# ─── Probabilités & confiance (Monte-Carlo gaussien sur les scores) ──────────

def _race_probabilities(scores, sigma=2.0, n=4000, seed=42):
    """À partir des scores (plus bas = mieux), renvoie (p_win, p_podium, confidence).

    Modèle : performance réelle ≈ score + bruit gaussien(sigma). On simule l'ordre
    d'arrivée n fois. La confiance reflète la séparation du score vs les voisins.
    """
    import numpy as np
    s = np.asarray(scores, dtype=float)
    k = len(s)
    if k == 0:
        return [], [], []
    rng = np.random.default_rng(seed)
    sim = s[None, :] + rng.normal(0.0, sigma, size=(n, k))
    ranks = sim.argsort(axis=1).argsort(axis=1)   # 0 = meilleur
    p_win    = (ranks == 0).mean(axis=0)
    p_podium = (ranks <= 2).mean(axis=0)

    # Confiance = écart de score au voisin le plus proche, normalisé 0..1.
    order = np.argsort(s)
    ss = s[order]
    gaps = np.full(k, np.inf)
    for rank, di in enumerate(order):
        left  = ss[rank] - ss[rank - 1] if rank > 0 else np.inf
        right = ss[rank + 1] - ss[rank] if rank < k - 1 else np.inf
        gaps[di] = min(left, right)
    finite = gaps[np.isfinite(gaps)]
    gmax = finite.max() if len(finite) and finite.max() > 0 else 1.0
    conf = np.clip(np.where(np.isfinite(gaps), gaps, gmax) / gmax, 0.0, 1.0)
    return p_win.tolist(), p_podium.tolist(), conf.tolist()


def _race_is_past(year, rnd) -> bool:
    from datetime import datetime, timezone
    import pandas as pd
    try:
        sched = _get_schedule_df(year)
        ev = sched[sched['RoundNumber'] == rnd]
        if ev.empty:
            return False
        utc_dt, _ = _race_datetime(ev.iloc[0])
        if utc_dt is None or (isinstance(utc_dt, float) and utc_dt != utc_dt):
            return False
        ts = pd.Timestamp(utc_dt)
        if ts.tzinfo is None:
            ts = ts.tz_localize('UTC')
        return ts < datetime.now(timezone.utc)
    except Exception:
        return False


def _accuracy_summary(drivers):
    """Métriques de justesse (prédit vs réel), comparées PAR PILOTE.

    Chaque pilote doit fournir 'driver_id', 'pos' (prédit) et 'actual' (réel).
    Les hits podium/top-10 comptent les pilotes correctement placés dans la zone,
    pas les numéros de position (qui se recouvrent toujours).
    """
    rated = [d for d in drivers
             if d.get('actual') is not None and d.get('driver_id')]
    if not rated:
        return None
    n = len(rated)
    mae = sum(abs(d['pos'] - d['actual']) for d in rated) / n
    exact = sum(1 for d in rated if d['pos'] == d['actual']) / n

    pred_podium_ids   = {d['driver_id'] for d in rated if d['pos'] <= 3}
    actual_podium_ids = {d['driver_id'] for d in rated if d['actual'] <= 3}
    pred_top10_ids    = {d['driver_id'] for d in rated if d['pos'] <= 10}
    actual_top10_ids  = {d['driver_id'] for d in rated if d['actual'] <= 10}

    pred_winner   = next((d['driver_id'] for d in rated if d['pos'] == 1), None)
    actual_winner = next((d['driver_id'] for d in rated if d['actual'] == 1), None)

    return {
        'mae':            round(mae, 2),
        'exact_pct':      round(exact * 100),
        'podium_hits':    len(pred_podium_ids & actual_podium_ids),
        'top10_hits':     len(pred_top10_ids & actual_top10_ids),
        'winner_correct': pred_winner is not None and pred_winner == actual_winner,
        'rated':          n,
    }


# ─── Tracé du circuit (télémétrie FastF1, mis en cache disque) ────────────────

def _circuit_slug(name: str) -> str:
    return ''.join(c if c.isalnum() else '_' for c in (name or '').lower()).strip('_')


def _build_track_outline(year, rnd, circuit):
    """SVG path + longueur + virages du circuit, depuis le tour le plus rapide.

    Cherche une session 'R' avec télémétrie : l'édition demandée si elle a eu
    lieu, sinon une édition antérieure du même circuit. Résultat caché sur disque.
    """
    import fastf1
    import numpy as np

    slug = _circuit_slug(circuit)
    disk = os.path.join(TRACK_CACHE_DIR, f'{slug}.json')
    if os.path.isfile(disk):
        try:
            with open(disk) as f:
                return json.load(f)
        except Exception:
            pass

    # Candidats : (year, rnd) si passé, puis éditions précédentes du même circuit.
    candidates = []
    if _race_is_past(year, rnd):
        candidates.append((year, rnd))
    for y in range(year - 1, 2017, -1):
        try:
            sched = _get_schedule_df(y)
            match = sched[sched['Location'].astype(str).str.lower() == circuit.lower()]
            for _, ev in match.iterrows():
                candidates.append((y, int(ev['RoundNumber'])))
        except Exception:
            continue

    for (cy, cr) in candidates[:4]:
        try:
            session = fastf1.get_session(cy, cr, 'R')
            session.load(laps=True, telemetry=True, weather=False, messages=False)
            lap = session.laps.pick_fastest()
            if lap is None:
                continue
            tel = lap.get_telemetry()
            x = tel['X'].to_numpy(dtype=float)
            y = tel['Y'].to_numpy(dtype=float)
            if len(x) < 20:
                continue

            # Downsample pour un path léger (~200 points).
            step = max(1, len(x) // 200)
            x, y = x[::step], y[::step]
            # Normaliser dans un viewBox 100x100 (y inversé pour l'écran).
            xmin, xmax = x.min(), x.max()
            ymin, ymax = y.min(), y.max()
            span = max(xmax - xmin, ymax - ymin) or 1.0
            pad = span * 0.06
            nx = (x - xmin) / span * 100
            ny = (ymax - y) / span * 100  # invert
            off_x = (100 - (xmax - xmin) / span * 100) / 2
            off_y = (100 - (ymax - ymin) / span * 100) / 2
            pts = [f'{nx[i] + off_x:.1f} {ny[i] + off_y:.1f}' for i in range(len(nx))]
            path = 'M' + ' L'.join(pts) + ' Z'

            length_m = float(tel['Distance'].max()) if 'Distance' in tel else None
            corners = None
            try:
                corners = int(len(session.get_circuit_info().corners))
            except Exception:
                corners = None
            laps_est = round(305000 / length_m) if length_m else None

            out = {
                'available': True,
                'path':      path,
                'length_km': round(length_m / 1000, 3) if length_m else None,
                'corners':   corners,
                'laps':      laps_est,
                'source_year': cy,
            }
            try:
                with open(disk, 'w') as f:
                    json.dump(out, f)
            except Exception:
                pass
            return out
        except Exception:
            continue

    out = {'available': False}
    return out


# ─── Dashboard justesse saison (worker en tâche de fond) ─────────────────────

_SEASON_JOBS: dict = {}
_SEASON_LOCK = threading.Lock()


def _race_accuracy(year, rnd):
    """Justesse d'une course passée (prédit vs réel). Caché sur disque."""
    disk = os.path.join(ACC_CACHE_DIR, f'{year}_{rnd}.json')
    if os.path.isfile(disk):
        try:
            with open(disk) as f:
                return json.load(f)
        except Exception:
            pass
    try:
        actual = predictor.load_actual_results(year, rnd)
        if not actual:
            return None
        df, event_name, _circuit, _pq, _ = predictor.predict(year, rnd, False)
        drivers = []
        for _, row in df.iterrows():
            did = str(row.get('DriverId', ''))
            drivers.append({'driver_id': did, 'pos': int(row['PredPos']),
                            'actual': actual.get(did)})
        summ = _accuracy_summary(drivers)
        if summ is None:
            return None
        summ['round'] = rnd
        summ['event_name'] = event_name
        try:
            with open(disk, 'w') as f:
                json.dump(summ, f)
        except Exception:
            pass
        return summ
    except Exception:
        return None


def _season_worker(year):
    job = _SEASON_JOBS[year]
    try:
        sched = _get_schedule_df(year)
        rounds = [int(r) for r in sched['RoundNumber']
                  if int(r) >= 1 and _race_is_past(year, int(r))]
        job['total'] = len(rounds)
        for rnd in rounds:
            acc = _race_accuracy(year, rnd)
            if acc:
                job['results'].append(acc)
            job['done'] += 1
        job['status'] = 'done'
    except Exception as e:  # noqa: BLE001
        job['status'] = 'error'
        job['error'] = str(e)


# ─── Explicabilité : facteurs clés par pilote (depuis SHAP) ──────────────────

# Human-readable English labels for every model feature.
FACTOR_LABELS = {
    'quali_position':          'Qualifying position',
    'GridPosition':            'Starting position',
    'quali_gap_to_pole':       'Gap to pole',
    'best_quali_time':         'Best qualifying time',
    'fp3_gap':                 'Practice gap to fastest',
    'fp_avg_gap':              'Average practice gap',
    'fp3_laps':                'Practice laps run',
    'fp3_vs_quali_delta':      'Practice vs qualifying delta',
    'driver_champ_pos':        'Championship position',
    'driver_champ_pts':        'Championship points',
    'constructor_champ_pos':   'Constructor standing',
    'constructor_champ_pts':   'Constructor points',
    'driver_form_pos_5':       'Recent form (last 5 avg)',
    'driver_form_pts_5':       'Recent points (5 races)',
    'driver_last_pos':         'Last result',
    'driver_last_pts':         'Points last race',
    'driver_reliability_10':   'Reliability (last 10)',
    'team_form_pos_5':         'Team form (5 races)',
    'driver_circuit_avg':      'History at this circuit',
    'team_circuit_avg':        'Team history at circuit',
    'teammate_grid':           "Teammate's grid",
    'grid_champ_delta':        'Grid vs championship rank',
    'season_progress':         'Season progress',
    'AirTemp_mean':            'Air temperature',
    'TrackTemp_mean':          'Track temperature',
    'Humidity_mean':           'Humidity',
    'WindSpeed_mean':          'Wind',
    'Rainfall':                'Rain',
    'driver_wet_advantage':    'Wet-weather advantage',
    'circuit_wet_rate':        'Circuit rain tendency',
    'circuit_dnf_rate':        'Circuit DNF rate',
    'driver_momentum':         'Momentum (recent trend)',
    'driver_vs_teammate_rate': 'Teammate dominance',
    'is_street_circuit':       'Street circuit',
    'driver_encoded':          'Driver skill level',
    'team_encoded':            'Team strength',
    'circuit_encoded':         'Circuit affinity',
    'Season':                  'Season',
    'Round':                   'Round',
}

# Courte explication par indicateur (affichée via le petit "i" de la modale).
FACTOR_HELP = {
    'quali_position':          'Where the driver qualified. The single strongest signal of race result — front-row starters usually finish near the front.',
    'GridPosition':            'The position the driver actually starts from, after any grid penalties are applied to the qualifying order.',
    'quali_gap_to_pole':       'Time gap to the pole-sitter in qualifying. A small gap means genuine front-running one-lap pace.',
    'best_quali_time':         "The driver's fastest qualifying lap time.",
    'fp3_gap':                 'Gap to the fastest car in final practice — a read on raw pace before qualifying.',
    'fp_avg_gap':              'Average practice pace gap to the fastest car across the session.',
    'fp3_laps':                'How many timed laps the driver completed in practice (track time and setup work).',
    'fp3_vs_quali_delta':      'How much the driver improved between practice and qualifying.',
    'driver_champ_pos':        "The driver's position in the championship standings going into this race.",
    'driver_champ_pts':        'Championship points the driver has scored so far this season.',
    'constructor_champ_pos':   "The team's place in the constructors' standings — a proxy for how strong the car is.",
    'constructor_champ_pts':   'Points the team has scored this season.',
    'driver_form_pos_5':       'Average finishing position over the last 5 races — recent form.',
    'driver_form_pts_5':       'Average points scored over the last 5 races.',
    'driver_last_pos':         'Where the driver finished in the previous race.',
    'driver_last_pts':         'Points scored in the previous race.',
    'driver_reliability_10':   'Share of the last 10 races the driver actually finished (no DNFs or mechanical retirements).',
    'team_form_pos_5':         "The team's average finishing position over the last 5 races.",
    'driver_circuit_avg':      'The driver\'s average finish at THIS circuit in past years — some tracks suit some drivers.',
    'team_circuit_avg':        "The team's historical average finish at this circuit.",
    'teammate_grid':           "Where the driver's teammate starts — a same-car benchmark of the weekend's pace.",
    'grid_champ_delta':        'Gap between starting position and championship rank — flags an unusually good or poor qualifying.',
    'season_progress':         'How far into the season we are; early and late races can behave differently.',
    'AirTemp_mean':            'Average air temperature during the session.',
    'TrackTemp_mean':          'Average track-surface temperature — drives tyre behaviour and degradation.',
    'Humidity_mean':           'Average humidity during the session.',
    'WindSpeed_mean':          'Average wind speed — gusty conditions hurt car balance.',
    'Rainfall':                'Whether it rained. Wet races shuffle the order and reward driver skill over car performance.',
    'driver_wet_advantage':    'How much better (or worse) this driver tends to do in the wet than in the dry.',
    'circuit_wet_rate':        'How often this circuit has seen rain historically.',
    'circuit_dnf_rate':        'How often cars fail to finish here — high-attrition tracks reward reliable, well-placed cars.',
    'driver_momentum':         "Whether the driver's recent results are trending up or down.",
    'driver_vs_teammate_rate': 'How often the driver beats their teammate — a measure of in-team dominance.',
    'is_street_circuit':       'Whether this is a street circuit, where walls are close, overtaking is hard and qualifying matters more.',
    'driver_encoded':          "The driver's overall skill level, learned by the model from years of results.",
    'team_encoded':            "The team's overall strength, learned by the model from history.",
    'circuit_encoded':         'The specific circuit, letting the model apply track-specific patterns it has learned.',
    'Season':                  'The season (year) of the race.',
    'Round':                   'Which round of the championship this race is.',
}

_POSITION_FEATS = {
    'GridPosition', 'quali_position', 'driver_champ_pos', 'constructor_champ_pos',
    'driver_form_pos_5', 'driver_last_pos', 'team_form_pos_5', 'driver_circuit_avg',
    'team_circuit_avg', 'teammate_grid',
}
_TIME_FEATS   = {'quali_gap_to_pole', 'best_quali_time', 'fp3_gap', 'fp_avg_gap',
                 'fp3_vs_quali_delta'}
_RATE_FEATS   = {'driver_reliability_10', 'circuit_wet_rate', 'circuit_dnf_rate',
                 'driver_vs_teammate_rate'}
_POINTS_FEATS = {'driver_champ_pts', 'driver_last_pts', 'driver_form_pts_5',
                 'constructor_champ_pts'}


def _is_nan(v) -> bool:
    try:
        return v != v
    except Exception:
        return False


def _fmt_feature_value(feat: str, val, row) -> str:
    """Formate la valeur brute d'une feature en texte lisible."""
    # Features encodées → on montre le vrai nom, pas l'entier d'encodage
    if feat == 'driver_encoded':
        return _display_name(str(row.get('DriverId', '')), str(row.get('Abbreviation', '')))
    if feat == 'team_encoded':
        return str(row.get('TeamName', '') or '—')
    if feat == 'circuit_encoded':
        return str(row.get('Circuit', '') or '—')
    if val is None or _is_nan(val):
        return '—'
    if feat == 'Rainfall':
        return 'Rain' if val else 'Dry'
    if feat == 'is_street_circuit':
        return 'Yes' if val else 'No'
    try:
        f = float(val)
    except (TypeError, ValueError):
        return str(val)
    if feat in _POSITION_FEATS:
        return f'P{round(f)}'
    if feat in _RATE_FEATS:
        return f'{f * 100:.0f}%'
    if feat in _POINTS_FEATS:
        return f'{f:.0f} pts'
    if feat in _TIME_FEATS:
        return f'{f:+.2f}s' if feat == 'fp3_vs_quali_delta' else f'{f:.2f}s'
    if feat in ('AirTemp_mean', 'TrackTemp_mean'):
        return f'{f:.0f}°C'
    if feat == 'Humidity_mean':
        return f'{f:.0f}%'
    if feat == 'WindSpeed_mean':
        return f'{f:.0f} km/h'
    if feat == 'season_progress':
        return f'{f * 100:.0f}%'
    return f'{f:.1f}'


def _build_factors(row, top_n: int = 4):
    """Key factors (SHAP) explaining a driver's predicted position.

    impact < 0 → pushes forward (boost) ; > 0 → holds back (penalty).
    """
    contribs = row.get('_shap_contribs')
    if contribs is None:
        return []
    top = contribs.abs().sort_values(ascending=False).head(top_n)
    max_abs = float(top.iloc[0]) if len(top) and top.iloc[0] else 1.0
    factors = []
    for feat in top.index:
        impact = float(contribs[feat])
        factors.append({
            'label':  FACTOR_LABELS.get(feat, feat),
            'value':  _fmt_feature_value(feat, row.get(feat), row),
            'effect': 'boost' if impact < 0 else 'penalty',
            'weight': round(abs(impact) / max_abs, 3) if max_abs else 0.0,
            'help':   FACTOR_HELP.get(feat, ''),
        })
    return factors


# ─── Météo (Open-Meteo, gratuit & sans clé) ──────────────────────────────────

# WMO weather codes → English label + icon (mapped to an SVG on the frontend).
WMO = {
    0:  ('Clear sky', 'clear'),
    1:  ('Mainly clear', 'mostly-clear'),
    2:  ('Partly cloudy', 'partly-cloudy'),
    3:  ('Overcast', 'cloudy'),
    45: ('Fog', 'fog'), 48: ('Freezing fog', 'fog'),
    51: ('Light drizzle', 'drizzle'), 53: ('Drizzle', 'drizzle'), 55: ('Dense drizzle', 'drizzle'),
    56: ('Freezing drizzle', 'drizzle'), 57: ('Freezing drizzle', 'drizzle'),
    61: ('Light rain', 'rain'), 63: ('Rain', 'rain'), 65: ('Heavy rain', 'rain'),
    66: ('Freezing rain', 'rain'), 67: ('Freezing rain', 'rain'),
    71: ('Light snow', 'snow'), 73: ('Snow', 'snow'), 75: ('Heavy snow', 'snow'),
    77: ('Snow grains', 'snow'),
    80: ('Rain showers', 'showers'), 81: ('Rain showers', 'showers'), 82: ('Heavy showers', 'showers'),
    85: ('Snow showers', 'snow'), 86: ('Snow showers', 'snow'),
    95: ('Thunderstorm', 'thunder'), 96: ('Thunderstorm with hail', 'thunder'), 99: ('Thunderstorm with hail', 'thunder'),
}


def _geocode(location: str, country: str):
    import requests
    geo_key = (location, country)
    if geo_key in _GEO_CACHE:
        return _GEO_CACHE[geo_key]
    for q in (location, country):
        if not q:
            continue
        try:
            r = requests.get(
                'https://geocoding-api.open-meteo.com/v1/search',
                params={'name': q, 'count': 1, 'language': 'fr', 'format': 'json'},
                timeout=8,
            )
            js = r.json()
            if js.get('results'):
                g = js['results'][0]
                coords = (g.get('latitude'), g.get('longitude'))
                _GEO_CACHE[geo_key] = coords
                return coords
        except Exception:
            continue
    _GEO_CACHE[geo_key] = (None, None)
    return None, None


def _fetch_weather(lat, lon, date_str, is_past):
    import requests
    url = ('https://archive-api.open-meteo.com/v1/archive' if is_past
           else 'https://api.open-meteo.com/v1/forecast')
    params = {
        'latitude': lat, 'longitude': lon,
        'daily': 'weather_code,temperature_2m_max,temperature_2m_min,'
                 'precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
        'timezone': 'auto', 'start_date': date_str, 'end_date': date_str,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        daily = r.json().get('daily') or {}
        if not daily.get('time'):
            return None
        code = (daily.get('weather_code') or [None])[0]
        label, icon = WMO.get(int(code) if code is not None else -1, ('—', 'cloudy'))
        tmax = (daily.get('temperature_2m_max') or [None])[0]
        tmin = (daily.get('temperature_2m_min') or [None])[0]
        return {
            'available':   True,
            'is_forecast': not is_past,
            'code':        code,
            'label':       label,
            'icon':        icon,
            'temp_max':    round(tmax) if tmax is not None else None,
            'temp_min':    round(tmin) if tmin is not None else None,
            'precip_mm':   (daily.get('precipitation_sum') or [None])[0],
            'precip_prob': (daily.get('precipitation_probability_max') or [None])[0],
            'wind':        round((daily.get('wind_speed_10m_max') or [0])[0] or 0),
        }
    except Exception:
        return None


def _race_datetime(ev_row):
    """(utc_iso, local_iso) de la session 'Race', sinon EventDate."""
    for i in range(5, 0, -1):
        name = ev_row.get(f'Session{i}')
        if isinstance(name, str) and name.strip().lower() == 'race':
            utc   = ev_row.get(f'Session{i}DateUtc')
            local = ev_row.get(f'Session{i}Date')
            return utc, local
    return ev_row.get('EventDate'), ev_row.get('EventDate')


# ─── Cache calendrier (mémoire + disque) ─────────────────────────────────────
#
# get_event_schedule() fait un appel réseau lent. On le partage entre /api/schedule
# et /api/raceinfo via un cache mémoire du DataFrame, et on persiste la liste des
# courses des saisons passées sur disque pour un démarrage à froid instantané.

_SCHED_DF: dict = {}
_SCHED_LOCK = threading.Lock()
_GEO_CACHE: dict = {}


def _get_schedule_df(year):
    """DataFrame du calendrier d'une saison, mis en cache en mémoire."""
    with _SCHED_LOCK:
        if year in _SCHED_DF:
            return _SCHED_DF[year]
    import fastf1
    df = fastf1.get_event_schedule(year, include_testing=False)
    with _SCHED_LOCK:
        _SCHED_DF[year] = df
    return df


def _build_races(df):
    races = []
    for _, ev in df.iterrows():
        try:
            rnd = int(ev['RoundNumber'])
        except (TypeError, ValueError):
            continue
        if rnd < 1:  # round 0 = essais pré-saison
            continue
        ev_date = ev.get('EventDate')
        try:
            date_str = ev_date.strftime('%d %b') if ev_date == ev_date else ''
        except Exception:
            date_str = ''
        races.append({
            'round':    rnd,
            'name':     str(ev.get('EventName', f'Round {rnd}')),
            'location': str(ev.get('Location', '') or ''),
            'country':  str(ev.get('Country', '') or ''),
            'date':     date_str,
        })
    return races


def _schedule_payload(year):
    """Liste des GP d'une saison : mémoire → disque (saisons passées) → réseau."""
    from datetime import date
    cache_key = ('schedule', year)
    with _lock:
        if cache_key in _cache:
            return _cache[cache_key]

    # Les saisons révolues sont immuables → cache disque pour un cold start rapide.
    is_archivable = year < date.today().year
    disk_path = os.path.join(SCHED_CACHE_DIR, f'{year}.json')
    if is_archivable and os.path.isfile(disk_path):
        try:
            with open(disk_path) as f:
                payload = json.load(f)
            with _lock:
                _cache[cache_key] = payload
            return payload
        except Exception:
            pass

    df = _get_schedule_df(year)
    payload = {'year': year, 'races': _build_races(df)}
    with _lock:
        _cache[cache_key] = payload
    if is_archivable:
        try:
            with open(disk_path, 'w') as f:
                json.dump(payload, f)
        except Exception:
            pass
    return payload


def _prewarm_schedules():
    """Pré-charge les calendriers en tâche de fond (saison courante d'abord)."""
    from datetime import date
    cur = date.today().year
    order = [cur, cur + 1] + [y for y in range(2018, cur) if y not in (cur, cur + 1)]
    for y in order:
        try:
            _schedule_payload(y)
        except Exception:
            continue


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/next')
def api_next():
    """Renvoie l'année et le round du prochain GP pour pré-remplir le formulaire."""
    from datetime import date
    year = date.today().year
    try:
        rnd, name = predictor.find_next_race(year)
    except Exception:
        rnd, name = None, None
    if rnd is None:
        # Plus de course cette année → bascule sur l'an prochain
        year += 1
        try:
            rnd, name = predictor.find_next_race(year)
        except Exception:
            rnd, name = None, None
    return jsonify({'year': year, 'round': rnd, 'event_name': name})


@app.route('/api/schedule')
def api_schedule():
    """Renvoie la liste des Grands Prix d'une saison (round + nom + lieu).

    Sert à alimenter la barre de recherche du frontend : on peut ainsi choisir
    une course par son nom, pas seulement par son numéro de manche.
    """
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parameter "year" is required.'}), 400

    try:
        return jsonify(_schedule_payload(year))
    except Exception as e:  # noqa: BLE001
        return jsonify({'error': f'Schedule unavailable: {e}'}), 502


@app.route('/api/raceinfo')
def api_raceinfo():
    """Infos d'une course pour le compte à rebours + la météo.

    Renvoie l'heure de départ (UTC + locale), le statut (à venir / terminée) et
    la météo : prévisions Open-Meteo si la course est future, relevés historiques
    si elle a déjà eu lieu.
    """
    try:
        year = int(request.args.get('year'))
        rnd  = int(request.args.get('round'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parameters "year" and "round" are required.'}), 400

    cache_key = ('raceinfo', year, rnd)
    with _lock:
        if cache_key in _cache:
            return jsonify(_cache[cache_key])

    from datetime import datetime, timezone
    import pandas as pd

    try:
        schedule = _get_schedule_df(year)
        ev = schedule[schedule['RoundNumber'] == rnd]
        if ev.empty:
            return jsonify({'error': 'Grand Prix not found.'}), 404
        ev = ev.iloc[0]
    except Exception as e:  # noqa: BLE001
        return jsonify({'error': f'Race unavailable: {e}'}), 502

    utc_dt, local_dt = _race_datetime(ev)

    def _iso(v, as_utc=False):
        if v is None or (isinstance(v, float) and v != v):
            return None
        try:
            ts = pd.Timestamp(v)
        except Exception:
            return None
        if pd.isna(ts):
            return None
        if as_utc and ts.tzinfo is None:
            ts = ts.tz_localize('UTC')
        return ts.isoformat()

    start_utc   = _iso(utc_dt, as_utc=True)
    start_local = _iso(local_dt)

    # Passé / futur
    now = datetime.now(timezone.utc)
    is_past = False
    date_str = None
    if utc_dt is not None and not (isinstance(utc_dt, float) and utc_dt != utc_dt):
        ts = pd.Timestamp(utc_dt)
        if ts.tzinfo is None:
            ts = ts.tz_localize('UTC')
        is_past = ts < now
        date_str = ts.strftime('%Y-%m-%d')

    location = str(ev.get('Location', '') or '')
    country  = str(ev.get('Country', '') or '')

    # Météo via Open-Meteo
    weather = {'available': False}
    if date_str:
        lat, lon = _geocode(location, country)
        if lat is not None:
            w = _fetch_weather(lat, lon, date_str, is_past)
            if w:
                weather = w

    payload = {
        'year':        year,
        'round':       rnd,
        'event_name':  str(ev.get('EventName', f'Round {rnd}')),
        'location':    location,
        'country':     country,
        'start_utc':   start_utc,
        'start_local': start_local,
        'is_past':     is_past,
        'weather':     weather,
    }
    with _lock:
        _cache[cache_key] = payload
    return jsonify(payload)


@app.route('/api/track')
def api_track():
    """Tracé du circuit + longueur / virages / nombre de tours estimé."""
    try:
        year = int(request.args.get('year'))
        rnd  = int(request.args.get('round'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parameters "year" and "round" are required.'}), 400

    cache_key = ('track', year, rnd)
    with _lock:
        if cache_key in _cache:
            return jsonify(_cache[cache_key])

    try:
        sched = _get_schedule_df(year)
        ev = sched[sched['RoundNumber'] == rnd]
        circuit = str(ev.iloc[0].get('Location', '')) if not ev.empty else ''
    except Exception:
        circuit = ''
    if not circuit:
        return jsonify({'available': False})

    out = _build_track_outline(year, rnd, circuit)
    with _lock:
        _cache[cache_key] = out
    return jsonify(out)


@app.route('/api/season')
def api_season():
    """Justesse du modèle sur toute une saison (calcul en tâche de fond + polling)."""
    try:
        year = int(request.args.get('year'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parameter "year" is required.'}), 400

    with _SEASON_LOCK:
        job = _SEASON_JOBS.get(year)
        if job is None:
            job = {'status': 'running', 'total': 0, 'done': 0, 'results': [], 'error': None}
            _SEASON_JOBS[year] = job
            threading.Thread(target=_season_worker, args=(year,), daemon=True).start()

    results = sorted(job['results'], key=lambda r: r.get('round', 0))
    # Agrégat saison
    summary = None
    if results:
        n = len(results)
        summary = {
            'races':         n,
            'avg_mae':       round(sum(r['mae'] for r in results) / n, 2),
            'avg_exact_pct': round(sum(r['exact_pct'] for r in results) / n),
            'podium_hits':   sum(r['podium_hits'] for r in results),
            'podium_max':    n * 3,
            'winners_correct': sum(1 for r in results if r.get('winner_correct')),
        }
    return jsonify({
        'year':    year,
        'status':  job['status'],
        'total':   job['total'],
        'done':    job['done'],
        'error':   job['error'],
        'summary': summary,
        'results': results,
    })


@app.route('/api/predict')
def api_predict():
    try:
        year = int(request.args.get('year'))
        rnd  = int(request.args.get('round'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Parameters "year" and "round" are required.'}), 400

    pre_quali = request.args.get('pre_quali', 'false').lower() in ('1', 'true', 'yes')
    weather_mode = request.args.get('weather', '').lower()
    if weather_mode not in ('wet', 'dry'):
        weather_mode = None
    key = (year, rnd, pre_quali, weather_mode)

    with _lock:
        if key in _cache:
            return jsonify(_cache[key])
        try:
            df, event_name, circuit, used_pre_quali, _ = predictor.predict(
                year, rnd, pre_quali, weather_mode
            )
        except Exception as e:  # noqa: BLE001
            return jsonify({'error': f'Prediction failed: {e}'}), 500

        # Probabilités (victoire / podium) + confiance sur l'ensemble du plateau.
        p_win, p_podium, conf = _race_probabilities(df['score'].tolist())

        # Résultats réels si la course est passée (mode normal uniquement : le
        # what-if météo n'est pas comparable au résultat réel).
        actual = {}
        if weather_mode is None and _race_is_past(year, rnd):
            actual = predictor.load_actual_results(year, rnd)

        drivers = []
        for i, (_, row) in enumerate(df.iterrows()):
            driver_id = str(row.get('DriverId', ''))
            abbrev    = str(row.get('Abbreviation', '') or '')
            name      = _display_name(driver_id, abbrev)
            team      = str(row.get('TeamName', '') or 'Unknown')

            grid = row.get('GridPosition')
            try:
                grid = int(grid) if grid == grid else None  # NaN check
            except (TypeError, ValueError):
                grid = None
            pos = int(row['PredPos'])
            delta = (grid - pos) if grid is not None else None
            act = actual.get(driver_id)

            drivers.append({
                'pos':       pos,
                'name':      name,
                'abbr':      _initials(name, abbrev),
                'driver_id': driver_id,
                'team':      team,
                'team_slug': _team_slug(team),
                'team_abbr': _team_abbr(team),
                'has_logo':  _have_team_logo(team),
                'color':     TEAM_COLORS.get(team, DEFAULT_COLOR),
                'grid':      grid,
                'delta':     delta,
                'score':     round(float(row['score']), 2),
                'confidence': round(float(conf[i]), 3) if i < len(conf) else None,
                'p_win':      round(float(p_win[i]), 3) if i < len(p_win) else None,
                'p_podium':   round(float(p_podium[i]), 3) if i < len(p_podium) else None,
                'actual':     act,
                'actual_delta': (pos - act) if act is not None else None,
                'has_photo': _have_headshot(driver_id),
                'factors':   _build_factors(row),
            })

        accuracy = _accuracy_summary(drivers) if actual else None

        payload = {
            'event_name':   event_name,
            'circuit':      circuit,
            'year':         year,
            'round':        rnd,
            'pre_quali':    bool(used_pre_quali),
            'weather_mode': weather_mode,
            'is_past':      bool(actual),
            'accuracy':     accuracy,
            'drivers':      drivers,
        }
        _cache[key] = payload
        return jsonify(payload)


if __name__ == '__main__':
    print('\n  Interface F1 → http://127.0.0.1:5000\n')
    # Pré-charge les calendriers en arrière-plan → changement d'année quasi instantané.
    # (évité sous le reloader Flask pour ne pas pré-charger deux fois)
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        threading.Thread(target=_prewarm_schedules, daemon=True).start()
    app.run(debug=True, port=5000)
