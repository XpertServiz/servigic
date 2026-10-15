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
  defaultWalletCeilingPKR: z.number().min(0).optional(),
  earlyProFreeJobs: z.number().int().min(0).max(100).optional(),
  alertNearestN: z.number().int().min(1).max(100).optional(),
  noBidsAfterMin: z.number().int().min(5).max(240).optional(),
  referralsEnabled: z.boolean().optional(),
  referralCustomerCreditPKR: z.number().int().min(0).max(100000).optional(),
  referralProBonusPKR: z.number().int().min(0).max(1000000).optional(),
  referralProJobsRequired: z.number().int().min(1).max(500).optional(),
  featureFlags: z
    .object({
      aiJobTriage: z.boolean(),
      aiLeadQualifier: z.boolean(),
      aiDisputeSummarizer: z.boolean(),
      aiBidWinHint: z.boolean(),
      paymentMode: z.enum(["CASH_WALLET", "PROTECTED"]),
      smsFallbackEnabled: z.boolean().optional(),
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
