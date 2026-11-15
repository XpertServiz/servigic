// Choices and the status machine for Big Projects (no server imports: the public form uses this too).
export const PROJECT_TRADES = [
  ["electrical", "Electrical wiring"],
  ["plumbing", "Plumbing"],
  ["painting", "Painting"],
  ["carpentry", "Carpentry and woodwork"],
  ["tiling", "Tiling and flooring"],
  ["false_ceiling", "False ceiling"],
  ["renovation", "Full renovation"],
  ["hvac", "AC / HVAC installation"],
  ["solar", "Solar"],
  ["cctv", "CCTV and security"],
  ["other", "Other"],
] as const;
export const PROJECT_TYPES = [["new", "New construction"], ["renovation", "Renovation"], ["fitout", "Fit-out (shop / office)"], ["society", "Society / building maintenance"], ["other", "Other"]] as const;
export const PROPERTY_STAGES = [["structure", "Structure only (grey)"], ["plastered", "Plastered"], ["finished", "Finished"], ["occupied", "Occupied"]] as const;
export const BUDGET_BANDS = [["u1", "Under 1 lakh"], ["1-2", "1 - 2 lakh"], ["2-5", "2 - 5 lakh"], ["5-10", "5 - 10 lakh"], ["10p", "10 lakh +"], ["unsure", "Not sure"]] as const;
export const START_WINDOWS = [["1w", "Within 1 week"], ["1m", "Within 1 month"], ["1-3m", "1 - 3 months"], ["planning", "Just planning"]] as const;

export const FORWARD = ["new", "contacted", "site_visit_scheduled", "estimate_sent", "negotiating", "accepted", "pros_assigned", "in_progress", "completed"] as const;
export const EXITS = ["on_hold", "lost", "cancelled"] as const;
export const ALL_STATUSES = [...FORWARD, ...EXITS] as const;
export const LOST_REASONS = ["price", "went_with_someone_else", "not_ready", "unreachable", "out_of_area", "duplicate", "spam"] as const;

export const label = (list: readonly (readonly [string, string])[], v: string | null | undefined) => list.find(([k]) => k === v)?.[1] ?? v ?? "-";

/** Forward moves, or an exit; from on_hold back to any forward step. */
export function canMove(from: string, to: string): boolean {
  if (from === to) return false;
  if ((EXITS as readonly string[]).includes(to)) return !["lost", "cancelled", "completed"].includes(from);
  const f = (FORWARD as readonly string[]).indexOf(from);
  const t = (FORWARD as readonly string[]).indexOf(to);
  if (t < 0) return false;
  return from === "on_hold" || t > f;
}

