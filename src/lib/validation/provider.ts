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
] as const;

export const providerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  trades: z.array(z.enum(TRADES)).min(1, "Select at least one trade"),
  skillsNote: z.string().trim().max(500).optional(),
  serviceRadiusKm: z.number().int().min(1).max(50),
  baseLat: z.number().min(-90).max(90),
  baseLng: z.number().min(-180).max(180),
  cnicUrl: z.string().url().optional(),
  selfieUrl: z.string().url().optional(),
  policeCertUrl: z.string().url().optional(),
  payoutMethod: z.enum(["EASYPAISA", "JAZZCASH", "BANK"]).optional(),
  payoutAccount: z.string().trim().max(60).optional(),
  agreementAccepted: z.boolean().optional(),
});
