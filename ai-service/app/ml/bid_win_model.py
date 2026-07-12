import math
import os

import torch
from torch import nn

from app.schemas import BidWinRequest

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "bid_win_model.pt")

FEATURE_NAMES = ["price_ratio", "eta_norm", "rating", "jobs_log", "distance_km"]


class BidWinNet(nn.Module):
    """Tiny MLP — 5 engineered features in, win-probability out. Deliberately
    small: launch volume won't support a deep model, and a small net trains
    fast on a laptop-sized CSV export with no GPU needed."""

    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(len(FEATURE_NAMES), 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return self.net(x)


def featurize(req: BidWinRequest) -> list[float]:
    price_ratio = req.pricePKR / max(req.categoryAvgPricePKR, 1)
    eta_norm = min(req.etaMinutes, 480) / 480
    rating = req.providerRatingAvg / 5
    jobs_log = math.log1p(req.providerJobsCompleted) / math.log1p(200)
    distance_norm = min(req.distanceKm, 20) / 20
    return [price_ratio, eta_norm, rating, jobs_log, distance_norm]


_model: BidWinNet | None = None
_model_loaded_attempted = False


def _try_load_model() -> BidWinNet | None:
    global _model, _model_loaded_attempted
    if _model_loaded_attempted:
        return _model
    _model_loaded_attempted = True
    if os.path.exists(MODEL_PATH):
        model = BidWinNet()
        model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
        model.eval()
        _model = model
    return _model


def predict_win_probability(req: BidWinRequest) -> tuple[float, bool]:
    """Returns (probability, is_heuristic)."""
    model = _try_load_model()
    features = featurize(req)

    if model is not None:
        with torch.no_grad():
            x = torch.tensor([features], dtype=torch.float32)
            prob = float(model(x).item())
        return prob, False

    # Heuristic fallback: cheaper-than-average + well-rated + close = higher win chance.
    price_ratio, eta_norm, rating, jobs_log, distance_norm = features
    score = (
        (1.4 - price_ratio) * 0.5
        + rating * 0.25
        + (1 - distance_norm) * 0.15
        + (1 - eta_norm) * 0.1
    )
    prob = 1 / (1 + math.exp(-4 * (score - 0.5)))
    return max(0.02, min(0.98, prob)), True
