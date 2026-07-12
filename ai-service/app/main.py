from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import disputes, leads, ml, triage

app = FastAPI(
    title="Servigic AI Service",
    description="LangChain agents (Job Triage, Lead Qualifier, Dispute Summarizer) + PyTorch ML "
    "(bid-win-probability, demand heatmap). Internal service — called by the Next.js app only.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(triage.router)
app.include_router(leads.router)
app.include_router(disputes.router)
app.include_router(ml.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
