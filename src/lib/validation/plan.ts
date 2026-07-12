import { z } from "zod";

export const createPlanSchema = z.object({
  categoryId: z.string().cuid(),
  city: z.string().trim().min(2),
  areaLabel: z.string().trim().min(2),
  exactAddress: z.string().trim().min(5),
  lat: z.number(),
  lng: z.number(),
  frequency: z.enum(["MONTHLY", "QUARTERLY", "BIANNUAL"]),
  pricePerVisitPKR: z.number().int().positive().max(1_000_000),
  firstVisitDate: z.string(),
});

export const planStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED"]),
});
