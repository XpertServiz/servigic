// Thin client for the Python ai-service (P8/P9). Every function returns null
// when AI_SERVICE_URL isn't configured or the call fails — callers must treat
// AI features as optional enhancements, never a hard dependency.

const BASE_URL = process.env.AI_SERVICE_URL;
const INTERNAL_KEY = process.env.INTERNAL_AI_SERVICE_KEY;

async function callAiService<T>(path: string, body: unknown): Promise<T | null> {
  if (!BASE_URL) return null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY ?? "" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface JobTriageResult {
  suggestedCategory: string;
  suggestedUrgency: "EMERGENCY" | "TODAY" | "SCHEDULED";
  suggestedBudgetMinPKR: number;
  suggestedBudgetMaxPKR: number;
  reasoning: string;
}

export function triageJob(description: string, categories: string[]) {
  return callAiService<JobTriageResult>("/triage/job", { description, categories });
}

export interface LeadQualifyInput {
  id: string;
  businessName: string;
  trade: string;
  city: string;
  areaLabel?: string | null;
  rating?: number | null;
  notes?: string | null;
}

export interface LeadQualifyResult {
  id: string;
  priorityScore: number;
  likelySoloOperator: boolean;
  outreachMessage: string;
}

export async function qualifyLeads(leads: LeadQualifyInput[]) {
  const result = await callAiService<{ results: LeadQualifyResult[] }>("/leads/qualify", { leads });
  return result?.results ?? null;
}

export interface DisputeSummary {
  summary: string;
  suggestedResolution: "RELEASE" | "PARTIAL_REFUND" | "FULL_REFUND";
  reasoning: string;
}

export function summarizeDispute(input: {
  jobTitle: string;
  reason: string;
  customerName: string;
  providerName: string;
  messages: string[];
}) {
  return callAiService<DisputeSummary>("/disputes/summarize", input);
}

export interface BidWinResult {
  winProbability: number;
  isHeuristic: boolean;
}

export function getBidWinProbability(input: {
  pricePKR: number;
  categoryAvgPricePKR: number;
  etaMinutes: number;
  providerRatingAvg: number;
  providerJobsCompleted: number;
  distanceKm: number;
}) {
  return callAiService<BidWinResult>("/ml/bid-win-probability", input);
}
