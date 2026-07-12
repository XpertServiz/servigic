import { z } from "zod";

export const submitPaymentSchema = z.object({
  method: z.enum(["JAZZCASH", "EASYPAISA", "BANK_TRANSFER", "CARD"]),
  proofImageUrl: z.string().url(),
});

export const bookingStatusSchema = z.object({
  status: z.enum(["ON_MY_WAY", "ARRIVED", "WORKING", "DONE"]),
});

export const locationPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const disputeSchema = z.object({
  reason: z.string().trim().min(5).max(500),
  photos: z.array(z.string().url()).max(6).default([]),
});

export const disputeResolveSchema = z.object({
  resolution: z.enum(["RELEASE", "PARTIAL_REFUND", "FULL_REFUND"]),
  notes: z.string().trim().max(500).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string()).max(6).default([]),
  comment: z.string().trim().max(500).optional(),
});

export const CUSTOMER_REVIEW_TAGS = ["Professional", "On time", "Clean work", "Cooperative", "Accurate description", "Paid no hassle"] as const;
export const PROVIDER_REVIEW_TAGS = ["Professional", "On time", "Clean work", "Good communication", "Fair price"] as const;

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});
