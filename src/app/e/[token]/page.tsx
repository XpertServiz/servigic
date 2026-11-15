import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EstimateActions } from "./EstimateActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your estimate | Servigic", robots: { index: false, follow: false } };

type Item = { trade?: string; description: string; unit: string; qty: number; unitPrice: number; materialsBy: string };
const isExpired = (d: Date | null) => !!d && d.getTime() < Date.now();
const money = (n: number, c: string) => `${c} ${Math.round(n).toLocaleString("en-US")}`;

// Private link from the email: the written estimate, readable and printable (Print > Save as PDF), with Accept / Ask for changes / Decline.
export default async function EstimatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const e = await prisma.bigProjectEstimate.findUnique({ where: { token }, include: { project: { select: { reference: true, customerName: true, city: true, area: true, warrantyDays: true } } } });
  if (!e) notFound();
  const items = e.items as unknown as Item[];
  const expired = isExpired(e.validUntil);
  return (
    <main className="container-x mx-auto max-w-[760px] py-10 print:py-0">
      <div className="mb-6 flex items-center justify-between"><span className="text-xl font-bold text-accent">Servigic</span><span className="text-sm text-text-muted">{e.project.reference} - version {e.version}</span></div>
      <h1 className="mb-1 text-2xl font-extrabold">Estimate for {e.project.customerName}</h1>
      <p className="mb-6 text-sm text-text-muted">{[e.project.area, e.project.city].filter(Boolean).join(", ")}{e.validUntil ? ` - valid until ${e.validUntil.toDateString()}` : ""}</p>
      <div className="overflow-x-auto rounded-[14px] border border-border-subtle">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-bg-elevated text-left text-xs uppercase tracking-wide text-text-muted"><tr><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Price</th><th className="p-3 text-end">Total</th></tr></thead>
          <tbody>
            {items.map((i, k) => (
              <tr key={k} className="border-t border-border-subtle">
                <td className="p-3">{i.description}<div className="text-xs text-text-muted">{i.materialsBy === "customer" ? "Materials supplied by you" : "Materials by Servigic"}</div></td>
                <td className="p-3">{i.qty} {i.unit}</td><td className="p-3">{money(i.unitPrice, e.currency)}</td><td className="p-3 text-end">{money(i.qty * i.unitPrice, e.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-end text-sm">
        {Number(e.discount) > 0 && <p className="text-text-muted">Subtotal {money(Number(e.subtotal), e.currency)} - discount {money(Number(e.discount), e.currency)}</p>}
        <p className="text-xl font-bold">Total {money(Number(e.total), e.currency)}</p>
      </div>
      {e.terms && <p className="mt-6 whitespace-pre-wrap text-sm text-text-muted">{e.terms}</p>}
      <p className="mt-6 text-sm text-text-muted">Servigic is responsible for the whole job. Any problem within {e.project.warrantyDays} days, we come back and fix it.</p>
      <div className="mt-8 print:hidden">
        {e.status === "sent" && !expired ? <EstimateActions token={token} /> : <p className="rounded-xl border border-border-subtle p-4 text-sm">{expired && e.status === "sent" ? "This estimate has expired. Please contact Servigic for a new one." : e.status === "superseded" ? "A newer estimate was sent. Please use the latest link." : `You answered this estimate: ${e.status.replace("_", " ")}.`}</p>}
      </div>
    </main>
  );
}
