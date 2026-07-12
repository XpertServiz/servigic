from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas import DisputeSummarizeRequest, DisputeSummarizeResponse


class _SummaryOutput(BaseModel):
    summary: str = Field(description="2-3 sentence neutral summary of the dispute for a human admin to read")
    suggested_resolution: str = Field(description="One of: RELEASE, PARTIAL_REFUND, FULL_REFUND")
    reasoning: str = Field(description="One sentence explaining why that resolution was suggested")


_SYSTEM = (
    "You are Servigic's Dispute Summarizer Agent, assisting a human admin who makes the final "
    "call on marketplace disputes between a customer and a service provider. You never resolve "
    "a dispute yourself — you summarize the situation neutrally and suggest a starting point for "
    "the admin's judgment: RELEASE (pay the provider in full — the work was likely done as agreed), "
    "PARTIAL_REFUND (evidence of a partial issue — split the difference), or FULL_REFUND (evidence "
    "the job wasn't done or was clearly unacceptable). Stay neutral and factual; do not assume one "
    "side is lying without clear textual evidence."
)

_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM),
        (
            "human",
            "Job: {job_title}\nCustomer: {customer_name}\nProvider: {provider_name}\n"
            "Dispute reason (from whoever opened it): {reason}\n\nChat history:\n{messages}",
        ),
    ]
)


async def summarize_dispute(request: DisputeSummarizeRequest) -> DisputeSummarizeResponse:
    if not settings.anthropic_api_key:
        return _heuristic_summary(request)

    llm = ChatAnthropic(model="claude-sonnet-4-5", api_key=settings.anthropic_api_key, temperature=0)
    structured_llm = llm.with_structured_output(_SummaryOutput)
    chain = _PROMPT | structured_llm

    result: _SummaryOutput = await chain.ainvoke(
        {
            "job_title": request.jobTitle,
            "customer_name": request.customerName,
            "provider_name": request.providerName,
            "reason": request.reason,
            "messages": "\n".join(request.messages) if request.messages else "(no chat messages)",
        }
    )

    resolution = result.suggested_resolution if result.suggested_resolution in ("RELEASE", "PARTIAL_REFUND", "FULL_REFUND") else "PARTIAL_REFUND"

    return DisputeSummarizeResponse(summary=result.summary, suggestedResolution=resolution, reasoning=result.reasoning)


def _heuristic_summary(request: DisputeSummarizeRequest) -> DisputeSummarizeResponse:
    return DisputeSummarizeResponse(
        summary=f"Dispute opened on '{request.jobTitle}'. Reason: {request.reason[:200]}",
        suggestedResolution="PARTIAL_REFUND",
        reasoning="Heuristic fallback (no ANTHROPIC_API_KEY configured) — defaults to a neutral split pending manual review.",
    )
