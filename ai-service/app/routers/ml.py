from fastapi import APIRouter, Depends

from app.auth import require_internal_key
from app.ml.bid_win_model import predict_win_probability
from app.ml.demand_model import forecast_demand
from app.schemas import BidWinRequest, BidWinResponse, DemandHeatmapRequest, DemandHeatmapResponse

router = APIRouter(prefix="/ml", tags=["ml"], dependencies=[Depends(require_internal_key)])


@router.post("/bid-win-probability", response_model=BidWinResponse)
async def post_bid_win_probability(request: BidWinRequest) -> BidWinResponse:
    prob, is_heuristic = predict_win_probability(request)
    return BidWinResponse(winProbability=prob, isHeuristic=is_heuristic)


@router.post("/demand-heatmap", response_model=DemandHeatmapResponse)
async def post_demand_heatmap(request: DemandHeatmapRequest) -> DemandHeatmapResponse:
    return forecast_demand(request)
