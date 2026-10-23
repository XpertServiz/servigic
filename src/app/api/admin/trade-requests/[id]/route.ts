import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { notify } from "@/lib/notify";
import { evaluateProActivation } from "@/lib/proActivation";
import { findJobsForProvider } from "@/lib/dispatch";

// Admin decision on one trade a pro asked to work in: approve it, reject it, or ask for a certificate / photo
// first (typically gas, electrical and AC work). Only approved trades ever reach ProviderProfile.trades, which is
// what job alerts, the job feed and bidding all read.
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), note: z.string().trim().min(3, "Give the pro a reason").max(300) }),
  z.object({ action: z.literal("request-certificate"), note: z.string().trim().max(300).optional() }),
]);

const pretty = (t: string) => t.replace(/_/g, " ").toLowerCase();

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const row = await prisma.providerTrade.findUnique({ where: { id }, include: { provider: { select: { id: true, userId: true, trades: true } } } });
  if (!row) return NextResponse.json({ error: "Trade request not found" }, { status: 404 });
  const label = pretty(row.trade);

  if (parsed.data.action === "approve") {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const max = settings?.maxTradesPerPro ?? 3;
    if (!row.provider.trades.includes(row.trade) && row.provider.trades.length >= max) {
      return NextResponse.json({ error: `This pro already has the maximum of ${max} approved trades.` }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.providerTrade.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), adminNote: null } }),
      prisma.providerProfile.update({
        where: { id: row.provider.id },
        data: { trades: Array.from(new Set([...row.provider.trades, row.trade])) },
      }),
    ]);
    await evaluateProActivation(row.provider.id).catch((e) => console.error("[trades] activation", e));
    await notify({
      userId: row.provider.userId,
      type: "SYSTEM",
      title: `${label[0].toUpperCase()}${label.slice(1)} approved`,
      body: "You will now get job alerts for this trade.",
      linkUrl: "/pro/profile",
    });
    // Jobs of this trade already waiting near him: tell him now instead of waiting for the next new job.
    const waiting = (await findJobsForProvider(row.provider.id).catch(() => [])).filter((j) => j.category.trade === row.trade);
    if (waiting.length > 0) {
      await notify({
        userId: row.provider.userId,
        type: "DISPATCH_ALERT",
        title: `${waiting.length} open ${label} job${waiting.length > 1 ? "s" : ""} near you`,
        body: "Open your job list and send your bid.",
        linkUrl: "/pro/jobs",
      }).catch(() => null);
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "reject") {
    await prisma.providerTrade.update({ where: { id }, data: { status: "REJECTED", reviewedAt: new Date(), adminNote: parsed.data.note } });
    await notify({
      userId: row.provider.userId,
      type: "SYSTEM",
      title: `${label[0].toUpperCase()}${label.slice(1)} was not approved`,
      body: parsed.data.note,
      linkUrl: "/pro/profile",
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.providerTrade.update({
    where: { id },
    data: { certificateRequested: true, adminNote: parsed.data.note ?? "Please upload a photo of your certificate or licence for this trade." },
  });
  await notify({
    userId: row.provider.userId,
    type: "SYSTEM",
    title: `Certificate needed for ${label}`,
    body: parsed.data.note ?? "Please upload a photo of your certificate or licence for this trade so we can approve it.",
    linkUrl: "/pro/profile",
  });
  return NextResponse.json({ ok: true });
}
