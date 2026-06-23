"""
features.py — Construit le dataset d'entraînement ML depuis les CSVs collectés.

Chaque ligne = un pilote dans un Grand Prix.
Toutes les features utilisent uniquement des données disponibles AVANT la course.

Usage:
  python src/features.py

Output:
  data/processed/features.csv
"""

import os
import numpy as np
import pandas as pd

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA   = os.path.join(ROOT, 'data', 'processed')
OUTPUT = os.path.join(DATA, 'features.csv')


# ─── Chargement ──────────────────────────────────────────────────────────────

def load_data():
    race  = pd.read_csv(os.path.join(DATA, 'race_results.csv'))
    qual  = pd.read_csv(os.path.join(DATA, 'qualifying_results.csv'))
    prac  = pd.read_csv(os.path.join(DATA, 'practice_results.csv'))
    d_std = pd.read_csv(os.path.join(DATA, 'driver_standings.csv'))
    c_std = pd.read_csv(os.path.join(DATA, 'constructor_standings.csv'))
    return race, qual, prac, d_std, c_std


# ─── Features de qualification ────────────────────────────────────────────────

def _timedelta_to_seconds(series):
    return pd.to_timedelta(series).dt.total_seconds()


def build_quali_features(qual):
    q = qual[['Season', 'Round', 'DriverId', 'Abbreviation', 'Position',
              'Q1', 'Q2', 'Q3']].copy()
    q = q.rename(columns={'Position': 'quali_position'})

    for col in ('Q1', 'Q2', 'Q3'):
        q[col] = _timedelta_to_seconds(q[col])

    q['best_quali_time'] = q['Q3'].fillna(q['Q2']).fillna(q['Q1'])

    session_best = (
        q.groupby(['Season', 'Round'])['best_quali_time']
        .min()
        .rename('session_best_time')
    )
    q = q.merge(session_best, on=['Season', 'Round'])
    q['quali_gap_to_pole'] = q['best_quali_time'] - q['session_best_time']

    return q[['Season', 'Round', 'DriverId', 'quali_position',
              'best_quali_time', 'quali_gap_to_pole']]


# ─── Features des essais libres ───────────────────────────────────────────────

def build_practice_features(prac):
    fp3 = prac[prac['SessionType'] == 'FP3'][
        ['Season', 'Round', 'Driver', 'GapToFastest', 'LapCount']
    ].rename(columns={
        'Driver':       'Abbreviation',
        'GapToFastest': 'fp3_gap',
        'LapCount':     'fp3_laps',
    })

    fp_avg = (
        prac.groupby(['Season', 'Round', 'Driver'])['GapToFastest']
        .mean()
        .reset_index()
        .rename(columns={'Driver': 'Abbreviation', 'GapToFastest': 'fp_avg_gap'})
    )

    return fp3.merge(fp_avg, on=['Season', 'Round', 'Abbreviation'], how='outer')


# ─── Features de forme récente ────────────────────────────────────────────────

def build_rolling_form(race):
    r = race.sort_values(['DriverId', 'Season', 'Round']).copy()
    r['finished'] = (r['Status'] == 'Finished').astype(float)

    r['driver_form_pos_5']     = r.groupby('DriverId')['Position'].transform(
        lambda x: x.shift(1).rolling(5, min_periods=1).mean())
    r['driver_form_pts_5']     = r.groupby('DriverId')['Points'].transform(
        lambda x: x.shift(1).rolling(5, min_periods=1).mean())
    r['driver_last_pos']       = r.groupby('DriverId')['Position'].transform(
        lambda x: x.shift(1))
    r['driver_last_pts']       = r.groupby('DriverId')['Points'].transform(
        lambda x: x.shift(1))
    r['driver_reliability_10'] = r.groupby('DriverId')['finished'].transform(
        lambda x: x.shift(1).rolling(10, min_periods=1).mean())

    team_avg = (
        race.groupby(['TeamName', 'Season', 'Round'])['Position']
        .mean().reset_index().rename(columns={'Position': 'team_avg_pos'})
        .sort_values(['TeamName', 'Season', 'Round'])
    )
    team_avg['team_form_pos_5'] = team_avg.groupby('TeamName')['team_avg_pos'].transform(
        lambda x: x.shift(1).rolling(5, min_periods=1).mean())

    r = r.merge(
        team_avg[['TeamName', 'Season', 'Round', 'team_form_pos_5']],
        on=['TeamName', 'Season', 'Round'], how='left',
    )

    return r[['Season', 'Round', 'DriverId', 'TeamName',
              'driver_form_pos_5', 'driver_form_pts_5',
              'driver_last_pos', 'driver_last_pts',
              'driver_reliability_10', 'team_form_pos_5']]


# ─── Historique circuit ────────────────────────────────────────────────────────

def build_circuit_history(race):
    r = race.sort_values(['DriverId', 'Circuit', 'Season', 'Round']).copy()
    r['driver_circuit_avg'] = r.groupby(['DriverId', 'Circuit'])['Position'].transform(
        lambda x: x.shift(1).expanding(min_periods=1).mean())

    team_circuit = (
        race.groupby(['TeamName', 'Circuit', 'Season', 'Round'])['Position']
        .mean().reset_index().rename(columns={'Position': 'team_pos'})
        .sort_values(['TeamName', 'Circuit', 'Season', 'Round'])
    )
    team_circuit['team_circuit_avg'] = team_circuit.groupby(['TeamName', 'Circuit'])['team_pos'].transform(
        lambda x: x.shift(1).expanding(min_periods=1).mean())

    r = r.merge(
        team_circuit[['TeamName', 'Circuit', 'Season', 'Round', 'team_circuit_avg']],
        on=['TeamName', 'Circuit', 'Season', 'Round'], how='left',
    )
    return r[['Season', 'Round', 'DriverId', 'driver_circuit_avg', 'team_circuit_avg']]


# ─── Feature coéquipier ───────────────────────────────────────────────────────

def build_teammate_features(df):
    """Position de grille du coéquipier (proxy pour la performance de la voiture)."""
    pairs = df[['Season', 'Round', 'TeamName', 'DriverId', 'GridPosition']].copy()
    pairs = pairs.merge(pairs, on=['Season', 'Round', 'TeamName'], suffixes=('', '_mate'))
    pairs = pairs[pairs['DriverId'] != pairs['DriverId_mate']]
    teammate = (
        pairs.groupby(['Season', 'Round', 'DriverId'])['GridPosition_mate']
        .mean().reset_index().rename(columns={'GridPosition_mate': 'teammate_grid'})
    )
    return teammate


# ─── Nouvelles features ───────────────────────────────────────────────────────

STREET_CIRCUITS = {
    'Monaco', 'Monte Carlo',           # Monaco GP
    'Baku',                            # Azerbaijan GP
    'Marina Bay', 'Singapore',         # Singapore GP
    'Jeddah',                          # Saudi Arabia GP
    'Miami', 'Miami Gardens',          # Miami GP
    'Las Vegas',                       # Las Vegas GP
    'Melbourne',                       # Australian GP (semi-street)
    'Montréal',                        # Canadian GP (semi-street)
}

def build_wet_features(race):
    """
    driver_wet_advantage : amélioration moyenne du pilote par temps de pluie
                           vs temps sec (positif = meilleur sous la pluie).
    circuit_wet_rate     : % historique de courses pluvieuses sur ce circuit.
    """
    r = race.sort_values(['DriverId', 'Season', 'Round']).copy()
    r['is_wet'] = r['Rainfall'].astype(bool)
    r['pos_if_wet'] = r['Position'].where(r['is_wet'])
    r['pos_if_dry'] = r['Position'].where(~r['is_wet'])

    r['driver_wet_avg'] = r.groupby('DriverId')['pos_if_wet'].transform(
        lambda x: x.shift(1).expanding(min_periods=1).mean()
    )
    r['driver_dry_avg'] = r.groupby('DriverId')['pos_if_dry'].transform(
        lambda x: x.shift(1).expanding(min_periods=1).mean()
    )
    # Positif = le pilote finit mieux (position plus basse) sous la pluie
    r['driver_wet_advantage'] = r['driver_dry_avg'] - r['driver_wet_avg']

    # Circuit wet rate : % de courses pluvieuses (données passées uniquement)
    circuit_wet = (
        race.groupby(['Circuit', 'Season', 'Round'])['Rainfall']
        .first().reset_index()
        .sort_values(['Circuit', 'Season', 'Round'])
    )
    circuit_wet['circuit_wet_rate'] = circuit_wet.groupby('Circuit')['Rainfall'].transform(
        lambda x: x.astype(float).shift(1).expanding(min_periods=1).mean()
    )
    r = r.merge(
        circuit_wet[['Circuit', 'Season', 'Round', 'circuit_wet_rate']],
        on=['Circuit', 'Season', 'Round'], how='left'
    )

    return r[['Season', 'Round', 'DriverId', 'driver_wet_advantage', 'circuit_wet_rate']]


def build_dnf_features(race):
    """circuit_dnf_rate : % historique de DNF sur ce circuit."""
    r = race.copy()
    r['dnf'] = (~r['Status'].fillna('').str.contains('Finished|Lap', regex=True)).astype(float)

    event_dnf = r.groupby(['Circuit', 'Season', 'Round'])['dnf'].mean().reset_index()
    event_dnf = event_dnf.sort_values(['Circuit', 'Season', 'Round'])
    event_dnf['circuit_dnf_rate'] = event_dnf.groupby('Circuit')['dnf'].transform(
        lambda x: x.shift(1).expanding(min_periods=1).mean()
    )
    return event_dnf[['Circuit', 'Season', 'Round', 'circuit_dnf_rate']]


def build_momentum(race):
    """
    driver_momentum : (moyenne pos 3 dernières courses) - (moyenne pos courses 4-6).
    Négatif = en progrès, positif = en régression.
    """
    r = race.sort_values(['DriverId', 'Season', 'Round']).copy()
    r['avg_last_3'] = r.groupby('DriverId')['Position'].transform(
        lambda x: x.shift(1).rolling(3, min_periods=1).mean()
    )
    r['avg_prev_3'] = r.groupby('DriverId')['Position'].transform(
        lambda x: x.shift(4).rolling(3, min_periods=1).mean()
    )
    r['driver_momentum'] = r['avg_last_3'] - r['avg_prev_3']
    return r[['Season', 'Round', 'DriverId', 'driver_momentum']]


def build_teammate_beat_rate(race):
    """driver_vs_teammate_rate : % des 10 dernières courses où le pilote bat son coéquipier."""
    pairs = race[['Season', 'Round', 'TeamName', 'DriverId', 'Position']].copy()
    pairs = pairs.merge(pairs, on=['Season', 'Round', 'TeamName'], suffixes=('', '_mate'))
    pairs = pairs[pairs['DriverId'] != pairs['DriverId_mate']]
    pairs['beat_mate'] = (pairs['Position'] < pairs['Position_mate']).astype(float)
    pairs = pairs.sort_values(['DriverId', 'Season', 'Round'])
    pairs['driver_vs_teammate_rate'] = pairs.groupby('DriverId')['beat_mate'].transform(
        lambda x: x.shift(1).rolling(10, min_periods=1).mean()
    )
    return (
        pairs.groupby(['Season', 'Round', 'DriverId'])['driver_vs_teammate_rate']
        .first().reset_index()
    )


# ─── Assembly final ───────────────────────────────────────────────────────────

def build_features():
    print("Chargement des données...")
    race, qual, prac, d_std, c_std = load_data()

    base_cols = [
        'Season', 'Round', 'EventName', 'Circuit', 'EventDate',
        'DriverId', 'Abbreviation', 'TeamName',
        'GridPosition', 'Position', 'Points', 'Status',
        'AirTemp_mean', 'TrackTemp_mean', 'Humidity_mean',
        'WindSpeed_mean', 'Rainfall',
    ]
    df = race[base_cols].copy()
    n0 = len(df)
    print(f"Base : {n0} lignes")

    # 1. Qualification
    print("→ Qualification...")
    df = df.merge(build_quali_features(qual), on=['Season', 'Round', 'DriverId'], how='left')

    # 2. Essais libres
    print("→ Essais libres...")
    df = df.merge(build_practice_features(prac), on=['Season', 'Round', 'Abbreviation'], how='left')

    # 3. Classements championnat
    print("→ Classements...")
    d = d_std.rename(columns={'BeforeRound': 'Round', 'Points': 'driver_champ_pts',
                               'Position': 'driver_champ_pos'})
    c = c_std.rename(columns={'BeforeRound': 'Round', 'Points': 'constructor_champ_pts',
                               'Position': 'constructor_champ_pos'})
    df = df.merge(d[['Season', 'Round', 'DriverId', 'driver_champ_pos', 'driver_champ_pts']],
                  on=['Season', 'Round', 'DriverId'], how='left')
    df = df.merge(c[['Season', 'Round', 'TeamName', 'constructor_champ_pos', 'constructor_champ_pts']],
                  on=['Season', 'Round', 'TeamName'], how='left')

    # 4. Forme récente
    print("→ Forme récente...")
    df = df.merge(build_rolling_form(race), on=['Season', 'Round', 'DriverId', 'TeamName'], how='left')

    # 5. Historique circuit
    print("→ Historique circuit...")
    df = df.merge(build_circuit_history(race), on=['Season', 'Round', 'DriverId'], how='left')

    # 6. Coéquipier
    print("→ Coéquipier...")
    df = df.merge(build_teammate_features(df), on=['Season', 'Round', 'DriverId'], how='left')

    # 7. Nouvelles features
    print("→ Météo / fiabilité / momentum...")
    df = df.merge(build_wet_features(race),         on=['Season', 'Round', 'DriverId'], how='left')
    df = df.merge(build_dnf_features(race),         on=['Circuit', 'Season', 'Round'], how='left')
    df = df.merge(build_momentum(race),             on=['Season', 'Round', 'DriverId'], how='left')
    df = df.merge(build_teammate_beat_rate(race),   on=['Season', 'Round', 'DriverId'], how='left')
    df['is_street_circuit'] = df['Circuit'].isin(STREET_CIRCUITS).astype(int)

    # 8. Features dérivées
    print("→ Features dérivées...")
    total_rounds = df.groupby('Season')['Round'].transform('max')
    df['season_progress']      = df['Round'] / total_rounds
    df['fp3_vs_quali_delta']   = df['fp3_gap'] - df['quali_gap_to_pole']
    df['grid_champ_delta']     = df['GridPosition'] - df['driver_champ_pos']

    # 9. Imputation des nulls
    print("→ Imputation...")
    # Circuit history : remplacer par forme globale quand premier passage
    df['driver_circuit_avg'] = df['driver_circuit_avg'].fillna(df['driver_form_pos_5'])
    df['team_circuit_avg']   = df['team_circuit_avg'].fillna(df['team_form_pos_5'])
    # fp3_gap : remplacer par moyenne FP quand pas de FP3 (sprint weekends)
    df['fp3_gap']            = df['fp3_gap'].fillna(df['fp_avg_gap'])
    # Round 1 : pas de classement avant → valeurs neutres
    df['driver_champ_pos']       = df['driver_champ_pos'].fillna(11)
    df['driver_champ_pts']       = df['driver_champ_pts'].fillna(0)
    df['constructor_champ_pos']  = df['constructor_champ_pos'].fillna(6)
    df['constructor_champ_pts']  = df['constructor_champ_pts'].fillna(0)
    # Pas de dernière course (nouveaux pilotes) → forme globale
    df['driver_last_pos']        = df['driver_last_pos'].fillna(df['driver_form_pos_5'])
    df['driver_last_pts']        = df['driver_last_pts'].fillna(df['driver_form_pts_5'])
    # Nouvelles features : valeurs neutres pour premières occurrences
    df['driver_wet_advantage']   = df['driver_wet_advantage'].fillna(0.0)
    df['circuit_wet_rate']       = df['circuit_wet_rate'].fillna(df['Rainfall'].astype(float) * 0.1)
    df['circuit_dnf_rate']       = df['circuit_dnf_rate'].fillna(0.15)  # ~15% DNF global
    df['driver_momentum']        = df['driver_momentum'].fillna(0.0)
    df['driver_vs_teammate_rate']= df['driver_vs_teammate_rate'].fillna(0.5)

    assert len(df) == n0, f"Lignes perdues ! ({len(df)} ≠ {n0})"

    df = df[df['Position'].notna()].copy()
    df['Position'] = df['Position'].astype(int)

    feature_cols = [
        'GridPosition', 'quali_position', 'quali_gap_to_pole', 'best_quali_time',
        'fp3_gap', 'fp3_laps', 'fp_avg_gap', 'fp3_vs_quali_delta',
        'driver_champ_pos', 'driver_champ_pts',
        'constructor_champ_pos', 'constructor_champ_pts',
        'driver_form_pos_5', 'driver_form_pts_5',
        'driver_last_pos', 'driver_last_pts', 'driver_reliability_10',
        'team_form_pos_5',
        'driver_circuit_avg', 'team_circuit_avg',
        'teammate_grid', 'grid_champ_delta',
        'season_progress',
        'AirTemp_mean', 'TrackTemp_mean', 'Humidity_mean', 'WindSpeed_mean', 'Rainfall',
        'driver_wet_advantage', 'circuit_wet_rate', 'circuit_dnf_rate',
        'driver_momentum', 'driver_vs_teammate_rate', 'is_street_circuit',
    ]

    print(f"\nDataset final : {len(df)} lignes, {len(df.columns)} colonnes")
    print("\nNulls sur les features :")
    nulls = df[feature_cols].isnull().sum()
    for col in feature_cols:
        pct = nulls[col] / len(df) * 100
        flag = "⚠" if pct > 5 else "✓"
        if nulls[col] > 0:
            print(f"  {flag} {col}: {nulls[col]} ({pct:.1f}%)")
    if (nulls == 0).all():
        print("  ✓ Aucun null")

    df.to_csv(OUTPUT, index=False)
    print(f"\nSauvegardé : {OUTPUT}")
    return df


if __name__ == '__main__':
    build_features()
