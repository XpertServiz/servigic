import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/requireRole";
import { setCountryState } from "@/lib/marketSync";

// The quick switch: Off / Waitlist / Pilot / Live for a whole country (and optionally its city list) in one call.
const schema = z.object({
  countryCode: z.string().trim().length(2),
  state: z.enum(["off", "waitlist", "pilot", "live"]),
  cities: z.array(z.string().trim().min(1).max(60)).max(60).optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const r = await setCountryState(parsed.data.countryCode, parsed.data.state, { cities: parsed.data.cities });
  revalidateTag("locale-configs", "max");
  return NextResponse.json({ ok: true, ...r });
}
