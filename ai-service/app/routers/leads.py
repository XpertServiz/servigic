from fastapi import APIRouter, Depends

from app.agents.lead_qualifier import qualify_leads
from app.auth import require_internal_key
from app.schemas import LeadQualifyRequest, LeadQualifyResponse

router = APIRouter(prefix="/leads", tags=["leads"], dependencies=[Depends(require_internal_key)])


@router.post("/qualify", response_model=LeadQualifyResponse)
async def post_qualify_leads(request: LeadQualifyRequest) -> LeadQualifyResponse:
    return await qualify_leads(request.leads)
