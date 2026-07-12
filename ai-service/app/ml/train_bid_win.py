"""
Trains the bid-win-probability model from a JSON export of historical bids.

Usage:
    python -m app.ml.train_bid_win path/to/bid-training-data.json

Get the export from the running Next.js app (admin-only):
    GET /api/admin/ml/bid-training-data
    (each row: pricePKR, categoryAvgPricePKR, etaMinutes, providerRatingAvg,
     providerJobsCompleted, distanceKm, won: 0|1)

Needs >= 200 resolved bids (won/lost) to be worth training — before that,
the heuristic fallback in bid_win_model.py is used automatically and is a
perfectly reasonable MVP substitute.
"""

import json
import sys
import os

import torch
from torch import nn, optim

from app.ml.bid_win_model import BidWinNet, MODEL_PATH, FEATURE_NAMES


def featurize_row(row: dict) -> list[float]:
    import math

    price_ratio = row["pricePKR"] / max(row["categoryAvgPricePKR"], 1)
    eta_norm = min(row["etaMinutes"], 480) / 480
    rating = row["providerRatingAvg"] / 5
    jobs_log = math.log1p(row["providerJobsCompleted"]) / math.log1p(200)
    distance_norm = min(row["distanceKm"], 20) / 20
    return [price_ratio, eta_norm, rating, jobs_log, distance_norm]


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m app.ml.train_bid_win path/to/bid-training-data.json")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        rows = json.load(f)

    if len(rows) < 50:
        print(f"Only {len(rows)} rows — need at least ~200 for a meaningful model. Aborting.")
        sys.exit(1)

    X = torch.tensor([featurize_row(r) for r in rows], dtype=torch.float32)
    y = torch.tensor([[float(r["won"])] for r in rows], dtype=torch.float32)

    model = BidWinNet()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    loss_fn = nn.BCELoss()

    epochs = 200
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(X)
        loss = loss_fn(pred, y)
        loss.backward()
        optimizer.step()
        if epoch % 20 == 0:
            print(f"epoch {epoch:4d}  loss {loss.item():.4f}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    torch.save(model.state_dict(), MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH} (features: {FEATURE_NAMES})")


if __name__ == "__main__":
    main()
