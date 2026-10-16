import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

// Pro-side job-alert controls (handoff §11.5): pause switch, quiet hours, daily cap.
const minute = z.number().int().min(0).max(1439);
const schema = z.object({
  paused: z.boolean().optional(),
  // Both null = quiet hours off.
  quietStartMin: minute.nullable().optional(),
  quietEndMin: minute.nullable().optional(),
  dailyCap: z.number().int().min(1).max(200).optional(),
  emailAlerts: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const d = parsed.data;

  const profile = await prisma.providerProfile.update({
    where: { userId: auth.session.user.id },
    data: {
      ...(d.paused !== undefined ? { alertsPaused: d.paused } : {}),
      ...(d.quietStartMin !== undefined ? { alertQuietStartMin: d.quietStartMin } : {}),
      ...(d.quietEndMin !== undefined ? { alertQuietEndMin: d.quietEndMin } : {}),
      ...(d.dailyCap !== undefined ? { alertDailyCap: d.dailyCap } : {}),
      ...(d.emailAlerts !== undefined ? { emailAlerts: d.emailAlerts } : {}),
    },
    select: { alertsPaused: true, alertQuietStartMin: true, alertQuietEndMin: true, alertDailyCap: true, emailAlerts: true },
  });
  return NextResponse.json({
    alerts: { paused: profile.alertsPaused, quietStartMin: profile.alertQuietStartMin, quietEndMin: profile.alertQuietEndMin, dailyCap: profile.alertDailyCap, emailAlerts: profile.emailAlerts },
  });
}
