import asyncio

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas import LeadInput, LeadQualifyResponse, LeadQualifyResult


class _QualifyOutput(BaseModel):
    priority_score: int = Field(description="1-100, higher = better recruiting target (has WhatsApp-friendly name, good rating, solo-sounding)")
    likely_solo_operator: bool = Field(description="True if the business name/notes suggest a solo tradesperson rather than a multi-staff company")
    outreach_message: str = Field(description="A short, warm bilingual Urdu/English WhatsApp message per the house style")


_SYSTEM = (
    "You are Servigic's Lead Qualifier Agent, recruiting home-service providers (plumbers, "
    "electricians, AC techs, etc.) in Pakistan onto a reverse-bidding marketplace. For each "
    "business lead scraped from Google Places, judge how promising they are as a solo/small "
    "operator (better fit than a large company) and draft a short outreach WhatsApp message "
    "in the house style — Roman Urdu greeting + English marketplace pitch, casual/respectful "
    "('sb' honorific), always ending with a registration link placeholder [LINK]. Example style: "
    "\"Assalam o Alaikum Ustad Rafiq sb — Servigic pe roz ke plumber jobs mil rahe hain aapke area "
    "Gulshan mein. Koi lead fee nahi — sirf kaam milne par 12% commission. Register: [LINK]\". "
    "Keep it under 300 characters."
)

_PROMPT = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM),
        (
            "human",
            "Business: {business_name}\nTrade: {trade}\nCity: {city}\nArea: {area}\nRating: {rating}\nNotes: {notes}",
        ),
    ]
)


async def _qualify_one(llm, lead: LeadInput) -> LeadQualifyResult:
    structured_llm = llm.with_structured_output(_QualifyOutput)
    chain = _PROMPT | structured_llm
    result: _QualifyOutput = await chain.ainvoke(
        {
            "business_name": lead.businessName,
            "trade": lead.trade,
            "city": lead.city,
            "area": lead.areaLabel or lead.city,
            "rating": lead.rating if lead.rating is not None else "unknown",
            "notes": lead.notes or "none",
        }
    )
    return LeadQualifyResult(
        id=lead.id,
        priorityScore=max(1, min(100, result.priority_score)),
        likelySoloOperator=result.likely_solo_operator,
        outreachMessage=result.outreach_message,
    )


def _heuristic_qualify(lead: LeadInput) -> LeadQualifyResult:
    score = 50 + int((lead.rating or 3.5) * 10)
    message = (
        f"Assalam o Alaikum {lead.businessName} sb — Servigic pe roz ke {lead.trade.lower()} jobs mil rahe hain "
        f"aapke area {lead.areaLabel or lead.city} mein. Koi lead fee nahi — sirf kaam milne par 12% commission. "
        f"Register: [LINK]"
    )
    return LeadQualifyResult(id=lead.id, priorityScore=min(100, score), likelySoloOperator=True, outreachMessage=message)


async def qualify_leads(leads: list[LeadInput]) -> LeadQualifyResponse:
    if not settings.anthropic_api_key:
        return LeadQualifyResponse(results=[_heuristic_qualify(l) for l in leads])

    llm = ChatAnthropic(model="claude-sonnet-4-5", api_key=settings.anthropic_api_key, temperature=0.4)
    results = await asyncio.gather(*(_qualify_one(llm, lead) for lead in leads))
    return LeadQualifyResponse(results=list(results))
