import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const wallets = await prisma.proWallet.findMany({
    orderBy: { balancePKR: "asc" },
    include: { provider: { include: { user: { select: { name: true, phone: true } } } } },
  });

  const header = "wallet_id,provider_name,phone,balance_pkr,ceiling_pkr,unsettled_job_count,dispatch_status\n";
  const rows = wallets
    .map((w) =>
      [
        w.id,
        w.provider.displayName || w.provider.user.name,
        w.provider.user.phone,
        w.balancePKR,
        w.ceilingPKR,
        w.unsettledJobCount,
        w.provider.dispatchStatus,
      ].join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="servigic-wallets-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
