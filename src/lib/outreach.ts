// Simple bilingual outreach template (Master Brief §9). The LangChain-based
// personalization/qualification agent is P8 (Python ai-service) — this is
// the plain-JS fallback so recruiting can start before that ships.
export function buildOutreachMessage(businessName: string, tradeLabel: string, city: string): string {
  return `Assalam o Alaikum ${businessName} — Servigic pe roz ke ${tradeLabel} jobs mil rahe hain ${city} mein. Koi lead fee nahi — sirf kaam milne par 12% commission. Register: https://servigic.com/signup?role=provider`;
}
