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

import os
import sys
import threading

from flask import Flask, jsonify, render_template, request

# predict.py vit dans le même dossier
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import predict as predictor  # noqa: E402

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBAPP_DIR = os.path.join(ROOT, 'webapp')

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


@app.route('/api/predict')
def api_predict():
    try:
        year = int(request.args.get('year'))
        rnd  = int(request.args.get('round'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Paramètres "year" et "round" requis.'}), 400

    pre_quali = request.args.get('pre_quali', 'false').lower() in ('1', 'true', 'yes')
    key = (year, rnd, pre_quali)

    with _lock:
        if key in _cache:
            return jsonify(_cache[key])
        try:
            df, event_name, circuit, used_pre_quali, _ = predictor.predict(
                year, rnd, pre_quali
            )
        except Exception as e:  # noqa: BLE001
            return jsonify({'error': f'Prédiction impossible : {e}'}), 500

        drivers = []
        for _, row in df.iterrows():
            driver_id = str(row.get('DriverId', ''))
            abbrev    = str(row.get('Abbreviation', '') or '')
            name      = _display_name(driver_id, abbrev)
            team      = str(row.get('TeamName', '') or 'Inconnu')

            grid = row.get('GridPosition')
            try:
                grid = int(grid) if grid == grid else None  # NaN check
            except (TypeError, ValueError):
                grid = None
            pos = int(row['PredPos'])
            delta = (grid - pos) if grid is not None else None

            drivers.append({
                'pos':       pos,
                'name':      name,
                'abbr':      _initials(name, abbrev),
                'driver_id': driver_id,
                'team':      team,
                'color':     TEAM_COLORS.get(team, DEFAULT_COLOR),
                'grid':      grid,
                'delta':     delta,
                'score':     round(float(row['score']), 2),
                'has_photo': _have_headshot(driver_id),
            })

        payload = {
            'event_name': event_name,
            'circuit':    circuit,
            'year':       year,
            'round':      rnd,
            'pre_quali':  bool(used_pre_quali),
            'drivers':    drivers,
        }
        _cache[key] = payload
        return jsonify(payload)


if __name__ == '__main__':
    print('\n  Interface F1 → http://127.0.0.1:5000\n')
    app.run(debug=True, port=5000)
