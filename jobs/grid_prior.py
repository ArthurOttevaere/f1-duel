"""Historical grid-position → finish-position prior.

The backtest (jobs/backtest.py) surfaced a coherence problem: the model playing
its raw ML order is a weak duel opponent — a human who simply copies the
starting grid beats it most weekends, because in modern F1 the grid is a very
strong predictor of the finish and exact-position hits dominate the score.

To make the model a genuine opponent (and to make its rarity multipliers
well-calibrated), we blend its Monte-Carlo position probabilities with an
empirical P(finish | grid) kernel built from past seasons. See
docs/GAME_DESIGN.md §2.2.
"""

from __future__ import annotations

import os

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RACE_RESULTS = os.path.join(ROOT, "data", "processed", "race_results.csv")
MAX_POS = 22
LAPLACE = 0.5

_KERNEL: np.ndarray | None = None


def grid_kernel(up_to_season: int | None = None) -> np.ndarray:
    """K[g-1, f-1] = P(finish f | start g), Laplace-smoothed, rows sum to 1."""
    global _KERNEL
    if _KERNEL is not None and up_to_season is None:
        return _KERNEL

    df = pd.read_csv(RACE_RESULTS)
    df = df[df["GridPosition"].notna() & df["Position"].notna()]
    if up_to_season is not None:
        df = df[df["Season"] < up_to_season]

    k = np.full((MAX_POS, MAX_POS), LAPLACE)
    for g, f in zip(df["GridPosition"].astype(int), df["Position"].astype(int)):
        if 1 <= g <= MAX_POS and 1 <= f <= MAX_POS:
            k[g - 1, f - 1] += 1.0
    k /= k.sum(axis=1, keepdims=True)

    if up_to_season is None:
        _KERNEL = k
    return k


def kernel_row(grid_pos: int | None, n: int) -> np.ndarray:
    """P(finish) distribution for a driver starting at `grid_pos`, length n."""
    if grid_pos is None or not (1 <= grid_pos <= MAX_POS):
        return np.full(n, 1.0 / n)
    row = grid_kernel()[grid_pos - 1, :n].copy()
    total = row.sum()
    return row / total if total > 0 else np.full(n, 1.0 / n)
