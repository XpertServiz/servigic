import { prisma } from "@/lib/prisma";
import { PaymentRow } from "./PaymentRow";

export default async function AdminPaymentsPage() {
  const payments = await prisma.payment.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
    include: { booking: { include: { job: true, customer: { select: { name: true, phone: true } } } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Payments</h1>
      <p className="mb-8 text-text-muted">Verify proof screenshots to unlock jobs — the money button.</p>

      <div className="flex flex-col gap-3">
        {payments.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
        {payments.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No payments awaiting verification.
          </div>
        )}
      </div>
    </div>
  );
}
