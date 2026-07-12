from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas import JobTriageRequest, JobTriageResponse


class _TriageOutput(BaseModel):
    category: str = Field(description="Best-matching category name from the provided list, verbatim")
    urgency: str = Field(description="One of: EMERGENCY, TODAY, SCHEDULED")
    budget_min_pkr: int = Field(description="Suggested minimum fair price in PKR")
    budget_max_pkr: int = Field(description="Suggested maximum fair price in PKR")
    reasoning: str = Field(description="One sentence explaining the classification")


_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are Servigic's Job Triage Agent for a Pakistan home-services marketplace. "
            "Given a customer's free-text job description, classify it into the correct trade "
            "category from the exact list provided, judge urgency, and suggest a realistic PKR "
            "price range a Karachi/Lahore/Islamabad customer should expect to pay. Categories "
            "reflecting genuine safety/utility emergencies (no water, no power, gas leak, flooding, "
            "car breakdown blocking travel) are EMERGENCY. Routine repairs needed the same day are "
            "TODAY. Anything the customer can wait days for is SCHEDULED. Be concise.",
        ),
        ("human", "Available categories: {categories}\n\nJob description:\n{description}"),
    ]
)


async def triage_job(request: JobTriageRequest) -> JobTriageResponse:
    if not settings.anthropic_api_key:
        return _heuristic_triage(request)

    llm = ChatAnthropic(model="claude-sonnet-4-5", api_key=settings.anthropic_api_key, temperature=0)
    structured_llm = llm.with_structured_output(_TriageOutput)
    chain = _PROMPT | structured_llm

    result: _TriageOutput = await chain.ainvoke(
        {"categories": ", ".join(request.categories), "description": request.description}
    )

    category = result.category if result.category in request.categories else request.categories[0]

    return JobTriageResponse(
        suggestedCategory=category,
        suggestedUrgency=result.urgency if result.urgency in ("EMERGENCY", "TODAY", "SCHEDULED") else "TODAY",
        suggestedBudgetMinPKR=max(0, result.budget_min_pkr),
        suggestedBudgetMaxPKR=max(result.budget_min_pkr, result.budget_max_pkr),
        reasoning=result.reasoning,
    )


_EMERGENCY_KEYWORDS = ["no water", "no power", "gas leak", "flooding", "sparking", "burst pipe", "emergency"]


def _heuristic_triage(request: JobTriageRequest) -> JobTriageResponse:
    """Fallback with zero external calls — used when ANTHROPIC_API_KEY isn't set,
    so the feature degrades to 'off' rather than erroring."""
    text = request.description.lower()
    urgency = "EMERGENCY" if any(k in text for k in _EMERGENCY_KEYWORDS) else "TODAY"
    category = request.categories[0] if request.categories else "Handyman"
    return JobTriageResponse(
        suggestedCategory=category,
        suggestedUrgency=urgency,
        suggestedBudgetMinPKR=1000,
        suggestedBudgetMaxPKR=3000,
        reasoning="Heuristic fallback (no ANTHROPIC_API_KEY configured) — keyword match only.",
    )
