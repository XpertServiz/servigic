import { NextResponse } from "next/server";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { bigProjectsEnabled } from "@/lib/bigProjects";
import { requestSchema, submitProject } from "@/lib/bigProjectsFlow";
import { toE164 } from "@/lib/phone";

// Public: a visitor asks for a Big Project estimate (no account needed). Honeypot + per-IP and per-phone limits.
export async function POST(req: Request) {
  if (!bigProjectsEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 404 });
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", field: String(parsed.error.issues[0]?.path[0] ?? "") }, { status: 400 });
  const d = parsed.data;
  if (d.website && d.website.trim() !== "") return NextResponse.json({ ok: true, reference: "SP-0000-0000" });
  const phone = toE164(d.phone, "PK");
  if (!phone) return NextResponse.json({ error: "phone", field: "phone" }, { status: 400 });
  const [ip, ph] = await Promise.all([checkRateLimit(`proj:ip:${clientKey(req)}`, 5, 3600), checkRateLimit(`proj:phone:${phone}`, 3, 86400)]);
  if (!ip.ok || !ph.ok) return NextResponse.json({ error: "rate" }, { status: 429 });
  const project = await submitProject(d, { source: "web", ipKey: clientKey(req) });
  return NextResponse.json({ ok: true, reference: project!.reference });
}
