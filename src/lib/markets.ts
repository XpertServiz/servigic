// Launch market config (Master Brief §11, P11 "Scale & Intl"). Only LIVE
// cities are exposed in customer/provider-facing pickers — Job/Booking/
// Payment amounts are hardcoded to PKR throughout the schema and UI
// (totalPKR, budgetPKR, etc.), so switching a city to LIVE is a real
// multi-currency migration (new schema fields, FX-safe rounding, PSP
// integration per §11), not a config flag. This file is the single source
// of truth for the city pickers and documents the roadmap in one place —
// see GCC_EXPANSION.md for what LIVE actually requires.
//
// ServiceCategory.activeCities (admin /admin/categories) is a separate,
// lower-stakes toggle — it only controls SEO/display targeting for that
// category, not whether jobs can actually be posted there, so all markets
// (including COMING_SOON ones) are safely toggleable there.
export interface Market {
  city: string;
  country: string;
  currency: "PKR" | "AED" | "SAR" | "CAD" | "USD" | "EUR" | "PLN" | "QAR";
  status: "LIVE" | "COMING_SOON";
}

export const MARKETS: Market[] = [
  { city: "Karachi", country: "Pakistan", currency: "PKR", status: "LIVE" },
  { city: "Lahore", country: "Pakistan", currency: "PKR", status: "LIVE" },
  { city: "Islamabad", country: "Pakistan", currency: "PKR", status: "LIVE" },
  { city: "Rawalpindi", country: "Pakistan", currency: "PKR", status: "LIVE" },
  { city: "Dubai", country: "UAE", currency: "AED", status: "COMING_SOON" },
  { city: "Riyadh", country: "Saudi Arabia", currency: "SAR", status: "COMING_SOON" },
  { city: "Jeddah", country: "Saudi Arabia", currency: "SAR", status: "COMING_SOON" },
  { city: "Doha", country: "Qatar", currency: "QAR", status: "COMING_SOON" },
  { city: "New York", country: "USA", currency: "USD", status: "COMING_SOON" },
  { city: "Toronto", country: "Canada", currency: "CAD", status: "COMING_SOON" },
  { city: "Berlin", country: "Germany", currency: "EUR", status: "COMING_SOON" },
  { city: "Warsaw", country: "Poland", currency: "PLN", status: "COMING_SOON" },
];

export const LIVE_CITIES = MARKETS.filter((m) => m.status === "LIVE").map((m) => m.city);
export const COMING_SOON_CITIES = MARKETS.filter((m) => m.status === "COMING_SOON").map((m) => m.city);
export const ALL_MARKET_CITIES = MARKETS.map((m) => m.city);
