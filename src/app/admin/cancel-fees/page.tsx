import { prisma } from "@/lib/prisma";
import { CancelFeeRow } from "./CancelFeeRow";

export const dynamic = "force-dynamic";

export default async function CancelFeesPage() {
  const rows = await prisma.booking.findMany({
    where: { cancelFeeStatus: "OWED" },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: { id: true, cancelFeePKR: true, status: true, updatedAt: true, cancelProof: true, job: { select: { title: true } }, customer: { select: { name: true, phone: true } }, providerUser: { select: { name: true } }, timeline: true },
  });
  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Cancellation fees</h1>
      <p className="mb-6 max-w-3xl text-text-muted">Customers who cancelled after the pro had left (or where the pro found nobody at the address). They cannot post new requests until the fee is cleared. When you mark a fee as paid, the pro&apos;s share is added to his wallet.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No unpaid cancellation fees.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((b) => (
            <CancelFeeRow key={b.id} row={{ id: b.id, fee: b.cancelFeePKR, title: b.job.title, customer: `${b.customer.name} (${b.customer.phone})`, pro: b.providerUser.name, when: b.updatedAt.toISOString(), proof: b.cancelProof as { lat: number | null; lng: number | null; at: string } | null }} />
          ))}
        </div>
      )}
    </div>
  );
}
