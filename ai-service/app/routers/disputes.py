from fastapi import APIRouter, Depends

from app.agents.dispute_summarizer import summarize_dispute
from app.auth import require_internal_key
from app.schemas import DisputeSummarizeRequest, DisputeSummarizeResponse

router = APIRouter(prefix="/disputes", tags=["disputes"], dependencies=[Depends(require_internal_key)])


@router.post("/summarize", response_model=DisputeSummarizeResponse)
async def post_summarize_dispute(request: DisputeSummarizeRequest) -> DisputeSummarizeResponse:
    return await summarize_dispute(request)
