import { z } from "zod";

export const upsertBidSchema = z.object({
  jobId: z.string().cuid(),
  pricePKR: z.number().int().min(1),
  etaMinutes: z.number().int().min(1).max(2880),
  message: z.string().trim().max(500).optional(),
});

export const DECLINE_REASONS = ["Too expensive", "ETA too long", "Low rating", "Other"] as const;

export const declineBidSchema = z.object({
  reason: z.enum(DECLINE_REASONS),
  note: z.string().trim().max(200).optional(),
});

export const counterBidSchema = z.object({
  counterPricePKR: z.number().int().min(1),
});
