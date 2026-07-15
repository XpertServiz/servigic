// Anonymous public-facing identity for providers/customers before a job is paid.
export function proSerial(serialNumber: number): string {
  return `Pro #${serialNumber}`;
}

export function firstNameOnly(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function distanceBand(km: number): string {
  if (km <= 2) return "0–2 km";
  if (km <= 4) return "2–4 km";
  if (km <= 7) return "4–7 km";
  return "7+ km";
}

// areaLabel is free text the customer types on Post a Job ("e.g.
// Gulshan-e-Iqbal") — nothing stops someone from typing a house/plot/block
// number in there, and that field (unlike exactAddress) is shown on public
// surfaces like the landing page ticker and reviews. Strip anything
// number-shaped before it ever renders publicly, so a specific house never
// leaks even if a customer typed one.
const ADDRESS_NOISE = /\b(house|home|plot|flat|apartment|apt|block|street|st|road|rd|sector|phase|floor|near|opposite|opp\.?)\b\.?\s*[#-]?\s*\d*[a-z]?\b/gi;
const HOUSE_NUMBER_TOKEN = /\b[a-z]{0,2}-?\d+[a-z]?(\/\d+)?\b/gi;

export function publicAreaLabel(areaLabel: string): string {
  const cleaned = areaLabel
    .replace(ADDRESS_NOISE, " ")
    .replace(HOUSE_NUMBER_TOKEN, " ")
    .replace(/[,#/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // If sanitizing ate everything meaningful, fall back to the last
  // comma-separated segment of the original (usually the neighborhood name).
  return cleaned.length >= 3 ? cleaned : (areaLabel.split(",").pop()?.trim() ?? areaLabel);
}
