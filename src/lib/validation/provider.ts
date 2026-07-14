import { z } from "zod";

export const TRADES = [
  "PLUMBER",
  "ELECTRICIAN",
  "AC_TECHNICIAN",
  "SOLAR_INSTALLER",
  "CARPENTER",
  "PAINTER",
  "APPLIANCE_REPAIR",
  "CAR_MECHANIC",
  "MOVERS",
  "CLEANER",
  "MASON",
  "HANDYMAN",
  "PEST_CONTROL",
  "ROOFING",
  "LOCKSMITH",
  "GARDENING",
  "TILING",
  "GENERATOR_REPAIR",
  "WATER_TANK_CLEANING",
  "GLASS_REPAIR",
  "WELDING",
  "UPHOLSTERY",
] as const;

// Partial on purpose: the provider profile row is created (with just a
// displayName) at signup, then filled in incrementally by two different
// screens that each only ever send a subset — mobile's KYC screen sends
// just cnicUrl/selfieUrl/policeCertUrl/agreementAccepted, while the web/app
// profile editor sends displayName/trades/radius/location. Requiring every
// field on every PUT broke the KYC-only submission with a confusing "expected
// string, received undefined" error.
export const providerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  trades: z.array(z.enum(TRADES)).min(1, "Select at least one trade").optional(),
  skillsNote: z.string().trim().max(500).optional(),
  serviceRadiusKm: z.number().int().min(1).max(50).optional(),
  baseLat: z.number().min(-90).max(90).optional(),
  baseLng: z.number().min(-180).max(180).optional(),
  cnicUrl: z.string().url().optional().or(z.literal("")),
  selfieUrl: z.string().url().optional().or(z.literal("")),
  photoQualityOk: z.boolean().optional(),
  policeCertUrl: z.string().url().optional().or(z.literal("")),
  payoutMethod: z.enum(["EASYPAISA", "JAZZCASH", "BANK"]).optional(),
  payoutAccount: z.string().trim().max(60).optional(),
  agreementAccepted: z.boolean().optional(),
});
