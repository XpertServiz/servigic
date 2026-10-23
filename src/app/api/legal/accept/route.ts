import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { requireRole } from "@/lib/requireRole";
import { agreementRole, checkAcceptance, pendingAgreement, recordAcceptance } from "@/lib/legal/acceptance";

const schema = z.object({ version: z.string(), hash: z.string(), signedName: z.string().trim().min(2).max(120), locale: z.string().max(10).optional() });

// A signed-in customer or pro accepts (e-signs) the current agreement: accounts made before e-signing existed, or a new version.
export async function POST(req: Request) {
  const auth = await requireRole("CUSTOMER", "PROVIDER");
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type your full name to sign.", code: "INVALID" }, { status: 400 });
  const role = agreementRole(auth.session.user.role);
  if (!role) return NextResponse.json({ error: "Not available for this account" }, { status: 403 });
  const agreement = await pendingAgreement(auth.session.user.id);
  if (!agreement) return NextResponse.json({ ok: true, already: true });
  const problem = checkAcceptance(parsed.data, agreement);
  if (problem) return NextResponse.json({ error: problem, code: "TERMS_OUTDATED", agreement }, { status: 409 });
  const source = (await headers()).get("authorization")?.startsWith("Bearer ") ? "app" : "web";
  await recordAcceptance({ userId: auth.session.user.id, role, agreement, input: parsed.data, source });
  return NextResponse.json({ ok: true });
}
