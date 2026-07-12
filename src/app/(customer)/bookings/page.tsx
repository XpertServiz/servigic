import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExpirySweep } from "@/lib/expiry";

export default async function CustomerBookingsPage() {
  await runExpirySweep();
  const session = await auth();

  const bookings = await prisma.booking.findMany({
    where: { customerId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { job: { include: { category: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Bookings</h1>
      <p className="mb-8 text-text-muted">Payment, live tracking, and history for your booked jobs.</p>

      <div className="flex flex-col gap-3">
        {bookings.map((b) => (
          <Link
            key={b.id}
            href={`/bookings/${b.id}`}
            className="flex items-center justify-between rounded-[12px] border border-border-subtle bg-bg-elevated p-5 hover:border-accent"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{b.job.category.icon}</span>
              <div>
                <div className="font-bold">{b.job.title}</div>
                <div className="text-sm text-text-muted">PKR {b.totalPKR.toLocaleString()}</div>
              </div>
            </div>
            <span className="rounded-full border border-border-subtle px-3 py-1 text-xs font-bold text-text-muted">
              {b.status.replace("_", " ")}
            </span>
          </Link>
        ))}
        {bookings.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-border-subtle p-10 text-center text-text-muted">
            No bookings yet.
          </div>
        )}
      </div>
    </div>
  );
}
