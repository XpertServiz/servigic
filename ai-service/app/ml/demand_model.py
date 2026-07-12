from collections import defaultdict

import torch

from app.schemas import DemandForecastPoint, DemandHeatmapRequest, DemandHeatmapResponse


def forecast_demand(request: DemandHeatmapRequest) -> DemandHeatmapResponse:
    """Zone/hour demand forecast (Master Brief §3, P9).

    Launch volume is far too small for a persisted deep model to generalize,
    so this fits a tiny per-(city, category) PyTorch ridge regression against
    hour-of-day on every request — genuinely uses PyTorch, degrades gracefully
    to the raw historical count when there's only one data point for a bucket.
    """
    if not request.history:
        return DemandHeatmapResponse(forecast=[], isHeuristic=True)

    groups: dict[tuple[str, str], list[tuple[int, int]]] = defaultdict(list)
    for point in request.history:
        groups[(point.city, point.category)].append((point.hourOfDay, point.jobCount))

    forecast: list[DemandForecastPoint] = []
    any_model_fit = False

    for (city, category), pairs in groups.items():
        if len(pairs) < 4:
            # Too little data to fit — just echo the historical average per hour.
            for hour, count in pairs:
                forecast.append(DemandForecastPoint(city=city, hourOfDay=hour, category=category, forecastJobCount=float(count)))
            continue

        any_model_fit = True
        hours = torch.tensor([[h / 23, (h / 23) ** 2] for h, _ in pairs], dtype=torch.float32)
        counts = torch.tensor([[c] for _, c in pairs], dtype=torch.float32)

        # Closed-form ridge regression — no iterative training loop needed for 2 features.
        lam = 0.1
        X = torch.cat([hours, torch.ones(len(pairs), 1)], dim=1)
        XtX = X.T @ X + lam * torch.eye(X.shape[1])
        weights = torch.linalg.solve(XtX, X.T @ counts)

        for hour in range(24):
            feat = torch.tensor([hour / 23, (hour / 23) ** 2, 1.0], dtype=torch.float32)
            pred = float((feat @ weights).item())
            forecast.append(DemandForecastPoint(city=city, hourOfDay=hour, category=category, forecastJobCount=max(0.0, pred)))

    return DemandHeatmapResponse(forecast=forecast, isHeuristic=not any_model_fit)
