import { z } from "zod";

export const createJobSchema = z.object({
  categoryId: z.string().cuid(),
  subServiceId: z.string().cuid().optional(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(10).max(1000),
  photos: z.array(z.string().url()).max(6).default([]),
  urgency: z.enum(["EMERGENCY", "TODAY", "SCHEDULED"]),
  scheduledAt: z.string().datetime().optional(),
  city: z.string().trim().min(2),
  areaLabel: z.string().trim().min(2).max(80),
  exactAddress: z.string().trim().min(5).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  budgetPKR: z.number().int().min(0).optional(),
});
