#!/bin/bash
#
# Launch F1 Predictor — double-clic depuis le Finder pour tout lancer.
#
#   • se place dans le dossier du projet (où qu'il soit)
#   • crée le venv et installe les dépendances si besoin
#   • démarre le serveur Flask
#   • ouvre http://127.0.0.1:5000 dans le navigateur dès qu'il répond
#
# Pour arrêter : ferme cette fenêtre ou fais Ctrl+C.

set -e

# ── Se placer dans le dossier du script (= racine du projet) ─────────────────
cd "$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  🏎  F1 Race Predictor"
echo "  ────────────────────────────────────────────"
echo "  Dossier : $(pwd)"
echo ""

PYBIN="venv/bin/python"

# ── Environnement virtuel + dépendances ──────────────────────────────────────
if [ ! -x "$PYBIN" ]; then
  echo "  → Création de l'environnement virtuel…"
  python3 -m venv venv
  "$PYBIN" -m pip install --upgrade pip >/dev/null
  echo "  → Installation des dépendances (peut prendre 1-2 min)…"
  "$PYBIN" -m pip install -r requirements.txt
elif ! "$PYBIN" -c "import flask, fastf1, xgboost, lightgbm, sklearn, numpy, pandas, requests" >/dev/null 2>&1; then
  echo "  → Dépendances manquantes, installation…"
  "$PYBIN" -m pip install -r requirements.txt
else
  echo "  ✓ Environnement prêt."
fi

# ── Vérifier que le modèle est entraîné ──────────────────────────────────────
if [ ! -f "models/meta.json" ] || [ ! -f "data/processed/features.csv" ]; then
  echo ""
  echo "  ⚠️  Modèle ou données absents."
  echo "     Lance d'abord (dans ce dossier) :"
  echo "       $PYBIN src/collect.py   # télécharge les données"
  echo "       $PYBIN src/features.py  # construit les features"
  echo "       $PYBIN src/train.py     # entraîne le modèle"
  echo ""
  read -n 1 -s -r -p "  Appuie sur une touche pour fermer…"
  exit 1
fi

URL="http://127.0.0.1:5000"

# ── Ouvrir le navigateur dès que le serveur répond (en arrière-plan) ─────────
(
  for _ in $(seq 1 60); do
    if curl -s -o /dev/null "$URL" 2>/dev/null; then
      open "$URL"
      break
    fi
    sleep 0.5
  done
) &

echo ""
echo "  → Démarrage du serveur… le navigateur s'ouvrira sur $URL"
echo "    (laisse cette fenêtre ouverte ; ferme-la pour arrêter)"
echo ""

# ── Lancer le serveur au premier plan (Ctrl+C / fermeture = arrêt) ───────────
exec "$PYBIN" src/app.py
