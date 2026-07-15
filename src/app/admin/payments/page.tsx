import { prisma } from "@/lib/prisma";
import { PaymentRow } from "./PaymentRow";
import { ChangeOrderRow } from "./ChangeOrderRow";
import { VerifyAllButton } from "./VerifyAllButton";

export default async function AdminPaymentsPage() {
  const [payments, changeOrders] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { createdAt: "asc" },
      include: { booking: { include: { job: true, customer: { select: { name: true, phone: true } } } } },
    }),
    prisma.changeOrder.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "asc" },
      include: { booking: { include: { job: true, customer: { select: { name: true, phone: true } } } } },
    }),
  ]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 font-display text-3xl font-bold">Payments</h1>
          <p className="text-text-muted">Verify proof screenshots to unlock jobs — the money button.</p>
        </div>
        <VerifyAllButton paymentIds={payments.map((p) => p.id)} />
      </div>

      <div className="flex flex-col gap-3">
        {payments.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
        {payments.length === 0 && changeOrders.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No payments awaiting verification.
          </div>
        )}
      </div>

      {changeOrders.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold uppercase">Change Order Payments</h2>
          <div className="flex flex-col gap-3">
            {changeOrders.map((c) => (
              <ChangeOrderRow key={c.id} changeOrder={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
