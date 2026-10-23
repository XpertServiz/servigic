import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/requireRole";
import { getAdminAccess } from "@/lib/adminAccess";
import { WIPE_PARTS, wipePreview, wipeTestData, type WipePart } from "@/lib/admin/purge";

export const maxDuration = 300;

const PARTS = Object.keys(WIPE_PARTS) as [WipePart, ...WipePart[]];
const schema = z.object({ parts: z.array(z.enum(PARTS)).min(1), confirm: z.string().optional(), dryRun: z.boolean().optional() });

async function superAdmin() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return { error: auth.response };
  const access = await getAdminAccess(auth.session.user.id);
  if (access.level !== "super_admin") return { error: NextResponse.json({ error: "Only a super admin can reset data." }, { status: 403 }) };
  return { userId: auth.session.user.id };
}

// What each part of the reset would delete.
export async function GET() {
  const who = await superAdmin();
  if ("error" in who) return who.error;
  return NextResponse.json({ preview: await wipePreview() });
}

// Wipes the chosen test data for a clean start. Requires confirm = "WIPE"; dryRun counts and rolls back.
export async function POST(req: Request) {
  const who = await superAdmin();
  if ("error" in who) return who.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose what to wipe." }, { status: 400 });
  const { parts, confirm, dryRun } = parsed.data;
  if (!dryRun && confirm !== "WIPE") return NextResponse.json({ error: "Type WIPE to confirm." }, { status: 400 });
  try {
    const counts = await wipeTestData(parts, Boolean(dryRun));
    if (!dryRun) console.warn(`[admin] data wiped by ${who.userId}`, parts, counts);
    return NextResponse.json({ ok: true, dryRun: Boolean(dryRun), counts });
  } catch (e) {
    console.error("[wipe]", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Wipe failed" }, { status: 500 });
  }
}
