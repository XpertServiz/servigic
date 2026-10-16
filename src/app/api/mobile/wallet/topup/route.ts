import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getPaymentAccounts } from "@/lib/paymentAccounts";

const topUpSchema = z.object({
  amountPKR: z.number().int().positive(),
  method: z.enum(["JAZZCASH", "EASYPAISA", "BANK_TRANSFER", "CARD"]),
  // Both are required: the admin verifies the payment by looking at the screenshot and matching the transaction id.
  proofImageUrl: z.string().url("Upload a screenshot of your payment"),
  reference: z
    .string()
    .trim()
    .min(6, "Enter the transaction ID from your payment (at least 6 characters)")
    .max(40)
    .regex(/^[A-Za-z0-9\-_/ ]+$/, "The transaction ID can only contain letters, numbers and dashes")
    .transform((v) => v.replace(/\s+/g, "").toUpperCase()),
});

// v6 addendum — Pro Commission Wallet. Pros settle their commission debt by
// topping up (JazzCash/EasyPaisa/bank), verified by an admin the same way
// customer escrow proof used to be (see src/app/api/admin/topups/[id]/verify).
export async function POST(req: Request) {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const parsed = topUpSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const minTopUp = settings?.minTopUpPKR ?? 500;
  if (parsed.data.amountPKR < minTopUp) {
    return NextResponse.json({ error: `The smallest top-up is PKR ${minTopUp.toLocaleString()}.`, code: "TOPUP_TOO_SMALL" }, { status: 400 });
  }
  const wallet = await prisma.proWallet.upsert({
    where: { providerId: profile.id },
    update: {},
    create: { providerId: profile.id, ceilingPKR: settings?.defaultWalletCeilingPKR ?? 3000 },
  });

  // The same payment cannot be claimed twice (by this pro or any other).
  const duplicate = await prisma.topUp.findFirst({ where: { reference: parsed.data.reference, status: { not: "REJECTED" } }, select: { id: true } });
  if (duplicate) {
    return NextResponse.json({ error: "This transaction ID was already submitted. Check the ID in your payment message.", code: "DUPLICATE_REFERENCE" }, { status: 409 });
  }

  const topUp = await prisma.topUp.create({
    data: {
      walletId: wallet.id,
      amountPKR: parsed.data.amountPKR,
      method: parsed.data.method,
      proofImageUrl: parsed.data.proofImageUrl,
      reference: parsed.data.reference,
    },
  });

  return NextResponse.json({ topUp });
}

export async function GET() {
  const auth = await requireRole("PROVIDER");
  if (!auth.ok) return auth.response;

  const profile = await prisma.providerProfile.findUnique({ where: { userId: auth.session.user.id } });
  if (!profile) return NextResponse.json({ error: "Provider profile not found" }, { status: 404 });

  const wallet = await prisma.proWallet.findUnique({
    where: { providerId: profile.id },
    include: {
      ledgerEntries: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { booking: { include: { job: { select: { title: true } } } } },
      },
      topUps: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  return NextResponse.json({
    // Where to send the money, for the top-up sheet.
    payTo: await getPaymentAccounts(),
    minTopUpPKR: (await prisma.siteSettings.findUnique({ where: { id: "singleton" }, select: { minTopUpPKR: true } }))?.minTopUpPKR ?? 500,
    wallet: wallet
      ? {
          balancePKR: wallet.balancePKR,
          ceilingPKR: wallet.ceilingPKR,
          unsettledJobCount: wallet.unsettledJobCount,
        }
      : { balancePKR: 0, ceilingPKR: 3000, unsettledJobCount: 0 },
    dispatchStatus: profile.dispatchStatus,
    dispatchBlockedReason: profile.dispatchBlockedReason,
    ledger: (wallet?.ledgerEntries ?? []).map((l) => ({
      id: l.id,
      type: l.type,
      amountPKR: l.amountPKR,
      memo: l.memo,
      jobTitle: l.booking?.job.title ?? null,
      createdAt: l.createdAt,
    })),
    topUps: (wallet?.topUps ?? []).map((t) => ({
      id: t.id,
      amountPKR: t.amountPKR,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
}
