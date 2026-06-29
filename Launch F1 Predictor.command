#!/bin/bash
#
# Launch F1 Predictor — double-clic depuis le Finder pour tout lancer.
#
#   • se place dans le dossier du projet (où qu'il soit)
#   • crée le venv et installe les dépendances si besoin
#   • démarre le serveur Flask
#   • ouvre http://127.0.0.1:5050 dans le navigateur dès qu'il répond
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

# Port 5050 : on évite 5000, accaparé par le récepteur AirPlay de macOS
# (ControlCenter), qui répond à la place de Flask → page blanche.
export F1_PORT=5050
export F1_NO_RELOAD=1          # pas de reloader Flask → démarrage net, un seul process
URL="http://127.0.0.1:${F1_PORT}"

# ── Arrêter un éventuel serveur F1 déjà lancé (double-clic répété, zombie) ────
pkill -f "src/app.py" 2>/dev/null || true
# Libérer le port s'il est encore occupé par une ancienne instance à nous.
if lsof -ti "tcp:${F1_PORT}" >/dev/null 2>&1; then
  lsof -ti "tcp:${F1_PORT}" | xargs kill 2>/dev/null || true
  sleep 1
fi

# ── Ouvrir le navigateur SEULEMENT quand Flask répond vraiment (HTTP 200) ────
# On vérifie un vrai 200 : une simple connexion TCP ne suffit pas (un autre
# service pourrait répondre et faire ouvrir une page blanche).
(
  # set +e dans le sous-shell : sous set -e, « code=$(curl…) » qui échoue
  # (connexion refusée pendant le démarrage) tuerait la boucle avant le 200.
  set +e
  for _ in $(seq 1 120); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
    if [ "$code" = "200" ]; then
      open -a Safari "$URL"
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
