"""
train.py — Entraîne et optimise un ensemble XGBoost + LightGBM.

Pipeline :
  1. Tuning des hyperparamètres via Optuna (50 trials par modèle)
  2. Entraînement final XGBoost + LightGBM sur 2018-2023
  3. Ensemble pondéré par la performance en validation
  4. Évaluation sur 2024 (val) et 2025-2026 (test)

Split temporel :
  Train : 2018-2023
  Val   : 2024
  Test  : 2025-2026

Usage:
  python src/train.py

Output:
  models/xgb_model.json
  models/lgb_model.txt
  models/meta.json
"""

import json
import os
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import optuna
import pandas as pd
from scipy.stats import spearmanr
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import lightgbm as lgb

optuna.logging.set_verbosity(optuna.logging.WARNING)

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA       = os.path.join(ROOT, 'data', 'processed')
MODELS_DIR = os.path.join(ROOT, 'models')

TRAIN_SEASONS = list(range(2018, 2024))
VAL_SEASONS   = [2024]
TEST_SEASONS  = [2025, 2026]
N_TRIALS      = 60   # trials Optuna par modèle

FEATURE_COLS = [
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
    'driver_encoded', 'team_encoded', 'circuit_encoded',
    'Season', 'Round',
]

TARGET = 'Position'


# ─── Métriques ───────────────────────────────────────────────────────────────

def evaluate(df_split, y_true, y_pred, label):
    mae  = np.mean(np.abs(y_true - y_pred))
    rmse = np.sqrt(np.mean((y_true - y_pred) ** 2))
    rho, _ = spearmanr(y_true, y_pred)

    df_eval = df_split.copy()
    df_eval['pred'] = y_pred
    top3_hits, total = 0, 0
    for _, race in df_eval.groupby(['Season', 'Round']):
        true_top3 = set(race.nsmallest(3, TARGET)['DriverId'])
        pred_top3 = set(race.nsmallest(3, 'pred')['DriverId'])
        top3_hits += len(true_top3 & pred_top3)
        total += 3

    top3_acc = top3_hits / total * 100
    print(f"  [{label}]  MAE={mae:.2f}  RMSE={rmse:.2f}  ρ={rho:.3f}  Top-3={top3_acc:.1f}%")
    return mae


# ─── Préparation ─────────────────────────────────────────────────────────────

def prepare(df):
    encoders = {}
    for col, enc_col in [('DriverId', 'driver_encoded'),
                         ('TeamName', 'team_encoded'),
                         ('Circuit',  'circuit_encoded')]:
        le = LabelEncoder()
        df[enc_col] = le.fit_transform(df[col].fillna('unknown'))
        encoders[col] = le

    df['Rainfall'] = df['Rainfall'].astype(int)
    X = df[FEATURE_COLS].copy()
    y = df[TARGET].astype(float)
    return X, y, encoders


# ─── Optuna : XGBoost ────────────────────────────────────────────────────────

def tune_xgb(X_train, y_train, X_val, y_val):
    def objective(trial):
        params = dict(
            n_estimators      = trial.suggest_int('n_estimators', 400, 2000),
            learning_rate     = trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
            max_depth         = trial.suggest_int('max_depth', 3, 9),
            subsample         = trial.suggest_float('subsample', 0.5, 1.0),
            colsample_bytree  = trial.suggest_float('colsample_bytree', 0.4, 1.0),
            min_child_weight  = trial.suggest_int('min_child_weight', 1, 20),
            reg_alpha         = trial.suggest_float('reg_alpha', 0.0, 5.0),
            reg_lambda        = trial.suggest_float('reg_lambda', 0.0, 5.0),
            gamma             = trial.suggest_float('gamma', 0.0, 2.0),
            random_state=42, n_jobs=-1, eval_metric='mae',
        )
        m = xgb.XGBRegressor(**params, early_stopping_rounds=50)
        m.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              verbose=False)
        return np.mean(np.abs(y_val - m.predict(X_val)))

    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=N_TRIALS, show_progress_bar=True)
    print(f"  Meilleur MAE XGB : {study.best_value:.3f}")
    return study.best_params


# ─── Optuna : LightGBM ───────────────────────────────────────────────────────

def tune_lgb(X_train, y_train, X_val, y_val):
    def objective(trial):
        params = dict(
            n_estimators      = trial.suggest_int('n_estimators', 400, 2000),
            learning_rate     = trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
            num_leaves        = trial.suggest_int('num_leaves', 20, 200),
            min_child_samples = trial.suggest_int('min_child_samples', 5, 50),
            subsample         = trial.suggest_float('subsample', 0.5, 1.0),
            colsample_bytree  = trial.suggest_float('colsample_bytree', 0.4, 1.0),
            reg_alpha         = trial.suggest_float('reg_alpha', 0.0, 5.0),
            reg_lambda        = trial.suggest_float('reg_lambda', 0.0, 5.0),
            random_state=42, n_jobs=-1, verbose=-1,
        )
        m = lgb.LGBMRegressor(**params)
        m.fit(X_train, y_train,
              eval_set=[(X_val, y_val)],
              callbacks=[lgb.early_stopping(50, verbose=False),
                         lgb.log_evaluation(-1)])
        return np.mean(np.abs(y_val - m.predict(X_val)))

    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=N_TRIALS, show_progress_bar=True)
    print(f"  Meilleur MAE LGB : {study.best_value:.3f}")
    return study.best_params


# ─── Entraînement final ───────────────────────────────────────────────────────

def train_final_xgb(params, X_train, y_train, X_val, y_val):
    m = xgb.XGBRegressor(**params, random_state=42, n_jobs=-1,
                          eval_metric='mae', early_stopping_rounds=50)
    m.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    return m


def train_final_lgb(params, X_train, y_train, X_val, y_val):
    m = lgb.LGBMRegressor(**params, random_state=42, n_jobs=-1, verbose=-1)
    m.fit(X_train, y_train,
          eval_set=[(X_val, y_val)],
          callbacks=[lgb.early_stopping(50, verbose=False),
                     lgb.log_evaluation(-1)])
    return m


# ─── Main ────────────────────────────────────────────────────────────────────

def train():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Chargement des features...")
    df = pd.read_csv(os.path.join(DATA, 'features.csv'))
    print(f"  {len(df)} lignes")

    X, y, encoders = prepare(df)

    train_mask = df['Season'].isin(TRAIN_SEASONS)
    val_mask   = df['Season'].isin(VAL_SEASONS)
    test_mask  = df['Season'].isin(TEST_SEASONS)

    X_train, y_train = X[train_mask], y[train_mask]
    X_val,   y_val   = X[val_mask],   y[val_mask]
    X_test,  y_test  = X[test_mask],  y[test_mask]

    print(f"  Train={len(X_train)}  Val={len(X_val)}  Test={len(X_test)}")

    # ── Tuning XGBoost
    print(f"\nTuning XGBoost ({N_TRIALS} trials)...")
    xgb_params = tune_xgb(X_train, y_train, X_val, y_val)

    # ── Tuning LightGBM
    print(f"\nTuning LightGBM ({N_TRIALS} trials)...")
    lgb_params = tune_lgb(X_train, y_train, X_val, y_val)

    # ── Entraînement final
    print("\nEntraînement final...")
    xgb_model = train_final_xgb(xgb_params, X_train, y_train, X_val, y_val)
    lgb_model = train_final_lgb(lgb_params, X_train, y_train, X_val, y_val)

    # ── Ensemble : poids inversement proportionnels au MAE val
    xgb_val_mae = np.mean(np.abs(y_val - xgb_model.predict(X_val)))
    lgb_val_mae = np.mean(np.abs(y_val - lgb_model.predict(X_val)))
    w_xgb = (1 / xgb_val_mae) / (1 / xgb_val_mae + 1 / lgb_val_mae)
    w_lgb = 1 - w_xgb
    print(f"\nPoids ensemble  XGB={w_xgb:.2f}  LGB={w_lgb:.2f}")

    def ensemble_predict(X):
        return w_xgb * xgb_model.predict(X) + w_lgb * lgb_model.predict(X)

    # ── Évaluation
    print("\n=== Résultats ===")
    evaluate(df[train_mask], y_train, ensemble_predict(X_train), 'Train')
    evaluate(df[val_mask],   y_val,   ensemble_predict(X_val),   'Val 2024')
    evaluate(df[test_mask],  y_test,  ensemble_predict(X_test),  'Test 2025-26')

    print("\n=== XGBoost seul ===")
    evaluate(df[val_mask], y_val, xgb_model.predict(X_val), 'Val 2024 XGB')

    print("\n=== LightGBM seul ===")
    evaluate(df[val_mask], y_val, lgb_model.predict(X_val), 'Val 2024 LGB')

    # ── Feature importance (XGBoost)
    print("\n=== Feature importance XGB (top 15) ===")
    imp = pd.Series(xgb_model.feature_importances_, index=FEATURE_COLS)
    print(imp.sort_values(ascending=False).head(15).round(4).to_string())

    # ── Sauvegarde
    xgb_path = os.path.join(MODELS_DIR, 'xgb_model.json')
    lgb_path  = os.path.join(MODELS_DIR, 'lgb_model.txt')
    xgb_model.save_model(xgb_path)
    lgb_model.booster_.save_model(lgb_path)

    meta = {
        'feature_cols': FEATURE_COLS,
        'target': TARGET,
        'train_seasons': TRAIN_SEASONS,
        'val_seasons':   VAL_SEASONS,
        'test_seasons':  TEST_SEASONS,
        'ensemble_weights': {'xgb': w_xgb, 'lgb': w_lgb},
        'xgb_params': xgb_params,
        'lgb_params':  lgb_params,
        'encoders': {col: list(le.classes_) for col, le in encoders.items()},
    }
    with open(os.path.join(MODELS_DIR, 'meta.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\nModèles sauvegardés dans : {MODELS_DIR}/")
    return xgb_model, lgb_model, w_xgb, w_lgb


if __name__ == '__main__':
    train()
