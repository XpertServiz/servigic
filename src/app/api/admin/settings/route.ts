import { NextResponse } from "next/server";
import { toE164 } from "@/lib/phone";
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
  referralNewProFreeJobs: z.number().int().min(0).max(500).optional(),
  referralNewCustomerDiscountPKR: z.number().int().min(0).max(100000).optional(),
  referralNewCustomerMinJobPKR: z.number().int().min(0).max(1000000).optional(),
  proRadiusMinKm: z.number().int().min(1).max(100).optional(),
  proRadiusMaxKm: z.number().int().min(1).max(200).optional(),
  proRadiusDefaultKm: z.number().int().min(1).max(200).optional(),
  maxTradesPerPro: z.number().int().min(1).max(10).optional(),
  payJazzcashNumber: z.string().trim().max(40).optional(),
  payJazzcashTitle: z.string().trim().max(80).optional(),
  payEasypaisaNumber: z.string().trim().max(40).optional(),
  payEasypaisaTitle: z.string().trim().max(80).optional(),
  payBankName: z.string().trim().max(80).optional(),
  payBankAccountTitle: z.string().trim().max(80).optional(),
  payBankAccountNumber: z.string().trim().max(60).optional(),
  announcementActive: z.boolean().optional(),
  announcementTitle: z.string().trim().max(80).optional(),
  announcementBody: z.string().trim().max(400).optional(),
  announcementAudience: z.enum(["ALL", "CUSTOMER", "PROVIDER"]).optional(),
  minAndroidVersionCode: z.number().int().min(0).max(1000000).optional(),
  storeUrlPro: z.string().trim().max(300).optional(),
  storeUrlCustomer: z.string().trim().max(300).optional(),
  minTopUpPKR: z.number().int().min(0).max(1000000).optional(),
  proAppLive: z.boolean().optional(),
  customerAppLive: z.boolean().optional(),
  proTesterGroupUrl: z.string().trim().max(300).optional(),
  proTestingOptInUrl: z.string().trim().max(300).optional(),
  customerPreregUrl: z.string().trim().max(300).optional(),
  signupNotifyEmail: z.string().trim().max(120).optional(),
  foundingProSlots: z.number().int().min(0).max(100000).optional(),
  foundingProPct: z.number().min(0).max(50).optional(),
  foundingProMonths: z.number().int().min(1).max(36).optional(),
  foundingProCity: z.string().trim().min(1).max(60).optional(),
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

  const d = parsed.data;
  // Saved in international form (+923001234567) so WhatsApp links work; a local number is read as Pakistani.
  if (d.whatsappSupportNumber) {
    const e164 = toE164(d.whatsappSupportNumber, "PK");
    if (!e164) return NextResponse.json({ error: "WhatsApp number is not valid. Use the international form, e.g. +92 300 1234567 or +966 50 123 4567." }, { status: 400 });
    d.whatsappSupportNumber = e164;
  }
  if (d.proRadiusMinKm != null && d.proRadiusMaxKm != null && d.proRadiusMinKm > d.proRadiusMaxKm) {
    return NextResponse.json({ error: "The smallest pro radius cannot be bigger than the largest." }, { status: 400 });
  }
  if (d.proRadiusDefaultKm != null && d.proRadiusMinKm != null && d.proRadiusMaxKm != null && (d.proRadiusDefaultKm < d.proRadiusMinKm || d.proRadiusDefaultKm > d.proRadiusMaxKm)) {
    return NextResponse.json({ error: "The default pro radius must sit between the smallest and largest." }, { status: 400 });
  }
  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });

  return NextResponse.json({ settings });
}
