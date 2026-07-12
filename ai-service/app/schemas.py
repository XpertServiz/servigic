from pydantic import BaseModel, Field


# ─── Job Triage ───
class JobTriageRequest(BaseModel):
    description: str = Field(..., min_length=5, max_length=1000)
    categories: list[str] = Field(..., description="Available category names, e.g. ['Plumber', 'Electrician', ...]")


class JobTriageResponse(BaseModel):
    suggestedCategory: str
    suggestedUrgency: str  # EMERGENCY | TODAY | SCHEDULED
    suggestedBudgetMinPKR: int
    suggestedBudgetMaxPKR: int
    reasoning: str


# ─── Lead Qualifier ───
class LeadInput(BaseModel):
    id: str
    businessName: str
    trade: str
    city: str
    areaLabel: str | None = None
    rating: float | None = None
    notes: str | None = None


class LeadQualifyRequest(BaseModel):
    leads: list[LeadInput]
    language: str = "ur-en"  # bilingual Urdu/English per the brief's example message


class LeadQualifyResult(BaseModel):
    id: str
    priorityScore: int  # 1-100
    likelySoloOperator: bool
    outreachMessage: str


class LeadQualifyResponse(BaseModel):
    results: list[LeadQualifyResult]


# ─── Dispute Summarizer ───
class DisputeSummarizeRequest(BaseModel):
    jobTitle: str
    reason: str
    customerName: str
    providerName: str
    messages: list[str] = Field(default_factory=list)


class DisputeSummarizeResponse(BaseModel):
    summary: str
    suggestedResolution: str  # RELEASE | PARTIAL_REFUND | FULL_REFUND
    reasoning: str


# ─── ML: bid-win-probability ───
class BidWinRequest(BaseModel):
    pricePKR: int
    categoryAvgPricePKR: int
    etaMinutes: int
    providerRatingAvg: float
    providerJobsCompleted: int
    distanceKm: float


class BidWinResponse(BaseModel):
    winProbability: float  # 0..1
    isHeuristic: bool  # true until a trained model is loaded


# ─── ML: demand heatmap ───
class DemandPoint(BaseModel):
    city: str
    hourOfDay: int
    category: str
    jobCount: int


class DemandHeatmapRequest(BaseModel):
    history: list[DemandPoint]


class DemandForecastPoint(BaseModel):
    city: str
    hourOfDay: int
    category: str
    forecastJobCount: float


class DemandHeatmapResponse(BaseModel):
    forecast: list[DemandForecastPoint]
    isHeuristic: bool
