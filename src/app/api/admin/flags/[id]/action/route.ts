import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

const schema = z.object({
  action: z.enum(["DISMISS", "WARN", "SUSPEND", "DELIST"]),
  note: z.string().max(500).optional(),
});

const STATUS_MAP = { DISMISS: "DISMISSED", WARN: "WARNED", SUSPEND: "SUSPENDED", DELIST: "DELISTED" } as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const flag = await prisma.providerFlag.findUnique({ where: { id } });
  if (!flag) return NextResponse.json({ error: "Flag not found" }, { status: 404 });

  await prisma.providerFlag.update({
    where: { id },
    data: {
      status: STATUS_MAP[parsed.data.action],
      reviewedBy: auth.session.user.id,
      reviewNote: parsed.data.note,
      reviewedAt: new Date(),
    },
  });

  // SUSPEND/DELIST are admin-issued dispatch holds — sticky until an admin
  // explicitly clears them (recomputeProviderStanding skips over these, see
  // src/lib/providerStanding.ts).
  if (parsed.data.action === "SUSPEND") {
    await prisma.providerProfile.update({
      where: { id: flag.providerId },
      data: { dispatchStatus: "SUSPENDED", dispatchBlockedReason: "ADMIN_FLAG", suspendedUntil: null },
    });
  } else if (parsed.data.action === "DELIST") {
    await prisma.providerProfile.update({
      where: { id: flag.providerId },
      data: { isVerified: false, isOnline: false, dispatchStatus: "SUSPENDED", dispatchBlockedReason: "ADMIN_FLAG" },
    });
  }

  return NextResponse.json({ ok: true });
}
