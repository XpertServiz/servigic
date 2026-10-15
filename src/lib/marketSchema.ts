import { z } from "zod";
import { Currency, MarketStatus } from "@prisma/client";

export const marketSchema = z.object({
  countryCode: z.string().trim().length(2).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2).max(60),
  cities: z.array(z.string().trim().min(1).max(60)).max(60),
  enabled: z.boolean(),
  status: z.nativeEnum(MarketStatus),
  currency: z.nativeEnum(Currency),
  phoneCode: z.string().trim().regex(/^\+\d{1,4}$/, "Phone code like +92"),
  timezone: z.string().trim().min(3).max(60),
});
