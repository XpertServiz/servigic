import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { isThemeName } from "@/lib/theme";

const schema = z.object({
  activeTheme: z.string().refine(isThemeName, "Unknown theme"),
  defaultCommissionPct: z.number().min(0).max(50),
  whatsappSupportNumber: z.string().trim().max(20).optional(),
  demoVideoCustomerUrl: z.string().trim().max(200).optional(),
  demoVideoProUrl: z.string().trim().max(200).optional(),
  featureFlags: z
    .object({
      aiJobTriage: z.boolean(),
      aiLeadQualifier: z.boolean(),
      aiDisputeSummarizer: z.boolean(),
      aiBidWinHint: z.boolean(),
    })
    .optional(),
});

export async function PUT(req: Request) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  return NextResponse.json({ settings });
}
