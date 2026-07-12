from fastapi import APIRouter, Depends

from app.agents.job_triage import triage_job
from app.auth import require_internal_key
from app.schemas import JobTriageRequest, JobTriageResponse

router = APIRouter(prefix="/triage", tags=["triage"], dependencies=[Depends(require_internal_key)])


@router.post("/job", response_model=JobTriageResponse)
async def post_triage_job(request: JobTriageRequest) -> JobTriageResponse:
    return await triage_job(request)
