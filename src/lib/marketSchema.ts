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
  // Planned launch day of the zone (shown on the zone dashboard); empty = not set.
  launchDate: z.string().trim().nullable().optional(),
  // Drawn geofence: polygons of [lat, lng] points. Empty/absent = no geofence (city names decide).
  polygons: z
    .array(z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).min(3).max(500))
    .max(20)
    .optional(),
});
