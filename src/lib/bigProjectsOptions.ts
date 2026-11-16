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


/** Short follow-up questions per trade (asked in step 2 of the form). Answers are saved as { "<trade>.<key>": "<answer>" }. */
export type TradeQuestion = { key: string; label: string; options?: readonly string[]; unit?: string };
export const TRADE_QUESTIONS: Record<string, readonly TradeQuestion[]> = {
  electrical: [
    { key: "rooms", label: "How many rooms / areas to wire?", unit: "number" },
    { key: "wiring", label: "Wiring type", options: ["Concealed (in wall)", "Surface", "Not sure"] },
    { key: "extras", label: "Extras needed", options: ["Main DB / breakers only", "Lights and sockets", "Full wiring plus AC / geyser points", "Not sure"] },
  ],
  plumbing: [
    { key: "bathrooms", label: "How many bathrooms / kitchens?", unit: "number" },
    { key: "pipes", label: "Pipework", options: ["New pipes", "Repair existing", "Both", "Not sure"] },
    { key: "extras", label: "Also needed", options: ["Water tank / pump", "Geyser", "Drainage", "None"] },
  ],
  painting: [
    { key: "scope", label: "What to paint", options: ["Inside only", "Outside only", "Inside and outside"] },
    { key: "rooms", label: "How many rooms?", unit: "number" },
    { key: "prep", label: "Wall condition", options: ["New plaster", "Old paint needs scraping", "Damp / cracks", "Not sure"] },
  ],
  carpentry: [
    { key: "items", label: "What do you need", options: ["Doors and windows", "Kitchen cabinets", "Wardrobes", "Furniture", "Mixed"] },
    { key: "material", label: "Material", options: ["Solid wood", "MDF / board", "Not sure"] },
  ],
  tiling: [
    { key: "area", label: "Area to cover (sq ft)", unit: "number" },
    { key: "where", label: "Where", options: ["Floors", "Walls", "Bathrooms", "Mixed"] },
    { key: "tiles", label: "Tiles", options: ["I have the tiles", "Servigic supplies", "Not decided"] },
  ],
  false_ceiling: [
    { key: "area", label: "Ceiling area (sq ft)", unit: "number" },
    { key: "type", label: "Type", options: ["Gypsum", "PVC", "Wood", "Not sure"] },
  ],
  renovation: [
    { key: "scope", label: "What is included", options: ["Single room / bathroom", "Kitchen", "Whole floor", "Whole house"] },
    { key: "structure", label: "Any wall or structure changes?", options: ["Yes", "No", "Not sure"] },
  ],
  hvac: [
    { key: "units", label: "How many AC units?", unit: "number" },
    { key: "type", label: "Type", options: ["Split", "Inverter split", "Ducted / central", "Not sure"] },
    { key: "supply", label: "Units", options: ["I have the units", "Servigic supplies", "Not decided"] },
  ],
  solar: [
    { key: "load", label: "Monthly electricity bill (PKR)", unit: "number" },
    { key: "system", label: "System", options: ["On-grid", "Hybrid with battery", "Not sure"] },
    { key: "roof", label: "Roof", options: ["Flat concrete", "Sloped / sheet", "Not sure"] },
  ],
  cctv: [
    { key: "cameras", label: "How many cameras?", unit: "number" },
    { key: "place", label: "Where", options: ["Home", "Shop / office", "Factory / warehouse"] },
    { key: "extras", label: "Also needed", options: ["Alarm", "Access control / intercom", "None"] },
  ],
};
export const questionLabel = (trade: string, key: string) => TRADE_QUESTIONS[trade]?.find((q) => q.key === key)?.label ?? key;

/** Saved answers as readable [question, answer] pairs. */
export function answerLines(answers: unknown): [string, string][] {
  if (!answers || typeof answers !== "object") return [];
  return Object.entries(answers as Record<string, unknown>).filter(([, v]) => typeof v === "string" && v).map(([k, v]) => {
    const [trade, key] = k.split(".");
    const t = PROJECT_TRADES.find((x) => x[0] === trade)?.[1] ?? trade;
    return [`${t}: ${questionLabel(trade, key ?? k)}`, String(v)] as [string, string];
  });
}

/** Countries offered in the waitlist form (Pakistan is live, so it is not listed). */
export const WAITLIST_COUNTRIES: readonly (readonly [string, string])[] = [
  ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"], ["QA", "Qatar"], ["KW", "Kuwait"], ["OM", "Oman"], ["BH", "Bahrain"],
  ["IN", "India"], ["BD", "Bangladesh"], ["LK", "Sri Lanka"], ["NP", "Nepal"], ["AF", "Afghanistan"],
  ["GB", "United Kingdom"], ["US", "United States"], ["CA", "Canada"], ["AU", "Australia"], ["DE", "Germany"], ["FR", "France"], ["ES", "Spain"], ["PL", "Poland"], ["IT", "Italy"],
  ["EG", "Egypt"], ["TR", "Turkey"], ["MY", "Malaysia"], ["SG", "Singapore"], ["ZA", "South Africa"], ["NG", "Nigeria"], ["KE", "Kenya"], ["XX", "Other country"],
];
